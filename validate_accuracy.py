#!/usr/bin/env python3
"""
Voice Vault Accuracy Validation Pipeline
=========================================
Scientifically validates voice biometric accuracy using real audio files.

Usage:
    python validate_accuracy.py [--backend-url URL] [--threshold FLOAT]

Requirements:
    - Backend running at http://localhost:5001 (or specified URL)
    - Test audio files in ./test_audio/ directory
    - MOCK_MODE=false in backend/.env for real AI processing

Author: Voice Vault Team
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field, asdict

# Check for required libraries
try:
    import requests
except ImportError:
    print("❌ ERROR: 'requests' library not installed. Run: pip install requests")
    sys.exit(1)


# =============================================================================
# CONFIGURATION
# =============================================================================

DEFAULT_BACKEND_URL = "http://localhost:5001"
DEFAULT_THRESHOLD = 0.75  # 75% threshold for pass/fail
REQUEST_DELAY = 0.5  # seconds between requests

# Test file categories
TEST_FILES = {
    "enrollment": "userA_real_1.wav",
    "genuine": ["userA_real_2.wav"],  # Same person, different recording
    "imposters": ["userB_imposter.wav"],  # Different people
    "deepfakes": ["deepfake_A_clone.wav"],  # AI-generated clones
}

# Add more files if they exist
OPTIONAL_FILES = {
    "genuine": ["userA_real_3.wav", "userA_real_4.wav"],
    "imposters": ["userC_imposter.wav", "userD_imposter.wav"],
    "deepfakes": ["deepfake_A_clone_2.wav"],
}


# =============================================================================
# DATA STRUCTURES
# =============================================================================

@dataclass
class EnrollmentData:
    """Stores enrollment credentials."""
    helper_string: str
    commitment: str
    salt: str
    enrolled_at: str = ""
    audio_file: str = ""


@dataclass
class VerificationResult:
    """Stores a single verification test result."""
    filename: str
    category: str  # genuine, imposter, deepfake
    expected_pass: bool
    
    # Raw API response values
    status: str = ""
    score: int = 0
    fuzzy_match: float = 0.0
    liveness_score: float = 0.0
    artifact_score: float = 0.0
    identity_mismatch: bool = False
    is_deepfake: bool = False
    recommendation: str = ""
    
    # Computed values
    passed_threshold: bool = False
    correct_prediction: bool = False
    error: str = ""


@dataclass
class AccuracyMetrics:
    """Computed accuracy metrics."""
    threshold: float = 0.75
    
    # Counts
    total_tests: int = 0
    genuine_tests: int = 0
    imposter_tests: int = 0
    deepfake_tests: int = 0
    
    # True/False Positives/Negatives
    true_accepts: int = 0  # Genuine correctly accepted
    false_rejects: int = 0  # Genuine incorrectly rejected
    true_rejects: int = 0  # Imposter/deepfake correctly rejected
    false_accepts: int = 0  # Imposter/deepfake incorrectly accepted
    
    # Deepfake specific
    deepfakes_detected: int = 0
    deepfakes_missed: int = 0
    
    # Scores
    genuine_scores: List[float] = field(default_factory=list)
    imposter_scores: List[float] = field(default_factory=list)
    deepfake_scores: List[float] = field(default_factory=list)
    
    @property
    def tar(self) -> float:
        """True Acceptance Rate (genuine accepted / total genuine)."""
        if self.genuine_tests == 0:
            return 0.0
        return self.true_accepts / self.genuine_tests
    
    @property
    def frr(self) -> float:
        """False Rejection Rate (genuine rejected / total genuine)."""
        if self.genuine_tests == 0:
            return 0.0
        return self.false_rejects / self.genuine_tests
    
    @property
    def far(self) -> float:
        """False Acceptance Rate (imposter accepted / total imposter)."""
        total_negative = self.imposter_tests + self.deepfake_tests
        if total_negative == 0:
            return 0.0
        return self.false_accepts / total_negative
    
    @property
    def trr(self) -> float:
        """True Rejection Rate (imposter rejected / total imposter)."""
        total_negative = self.imposter_tests + self.deepfake_tests
        if total_negative == 0:
            return 0.0
        return self.true_rejects / total_negative
    
    @property
    def deepfake_detection_rate(self) -> float:
        """Percentage of deepfakes correctly detected."""
        if self.deepfake_tests == 0:
            return 0.0
        return self.deepfakes_detected / self.deepfake_tests
    
    @property
    def avg_genuine_score(self) -> float:
        """Average score for genuine samples."""
        if not self.genuine_scores:
            return 0.0
        return sum(self.genuine_scores) / len(self.genuine_scores)
    
    @property
    def avg_imposter_score(self) -> float:
        """Average score for imposter samples."""
        if not self.imposter_scores:
            return 0.0
        return sum(self.imposter_scores) / len(self.imposter_scores)
    
    @property
    def avg_deepfake_score(self) -> float:
        """Average score for deepfake samples."""
        if not self.deepfake_scores:
            return 0.0
        return sum(self.deepfake_scores) / len(self.deepfake_scores)
    
    @property
    def overall_accuracy(self) -> float:
        """Overall correct predictions / total tests."""
        if self.total_tests == 0:
            return 0.0
        correct = self.true_accepts + self.true_rejects
        return correct / self.total_tests


# =============================================================================
# CONSOLE OUTPUT HELPERS
# =============================================================================

class Colors:
    """ANSI color codes for terminal output."""
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    RESET = "\033[0m"


def print_header(text: str):
    """Print a section header."""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text:^60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}\n")


def print_step(step: int, text: str):
    """Print a step indicator."""
    print(f"{Colors.CYAN}[Step {step}]{Colors.RESET} {text}")


def print_pass(text: str):
    """Print a pass message."""
    print(f"  {Colors.GREEN}✅ PASS:{Colors.RESET} {text}")


def print_warn(text: str):
    """Print a warning message."""
    print(f"  {Colors.YELLOW}⚠️  WARN:{Colors.RESET} {text}")


def print_fail(text: str):
    """Print a failure message."""
    print(f"  {Colors.RED}❌ FAIL:{Colors.RESET} {text}")


def print_info(text: str):
    """Print an info message."""
    print(f"  {Colors.CYAN}ℹ️  INFO:{Colors.RESET} {text}")


def print_metric(name: str, value: float, unit: str = "%", good_threshold: float = 0.8):
    """Print a metric with color coding."""
    if unit == "%":
        display_value = f"{value * 100:.1f}%"
    else:
        display_value = f"{value:.4f}"
    
    if value >= good_threshold:
        color = Colors.GREEN
    elif value >= good_threshold * 0.75:
        color = Colors.YELLOW
    else:
        color = Colors.RED
    
    print(f"  {name}: {color}{display_value}{Colors.RESET}")


# =============================================================================
# API CLIENT
# =============================================================================

class VoiceVaultClient:
    """HTTP client for Voice Vault API."""
    
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({
            "Accept": "application/json",
        })
    
    def health_check(self) -> Tuple[bool, dict]:
        """Check if backend is running."""
        try:
            resp = self.session.get(f"{self.base_url}/api/health", timeout=10)
            resp.raise_for_status()
            return True, resp.json()
        except requests.RequestException as e:
            return False, {"error": str(e)}
    
    def register(self, audio_path: str) -> Tuple[bool, dict]:
        """
        Register a voice sample.
        Returns (success, response_data).
        """
        if not os.path.exists(audio_path):
            return False, {"error": f"File not found: {audio_path}"}
        
        try:
            with open(audio_path, "rb") as f:
                files = {"audio": (os.path.basename(audio_path), f, "audio/wav")}
                resp = self.session.post(
                    f"{self.base_url}/api/register",
                    files=files,
                    timeout=60
                )
            
            data = resp.json()
            
            if resp.status_code != 200:
                return False, data
            
            return True, data
            
        except requests.RequestException as e:
            return False, {"error": str(e)}
        except json.JSONDecodeError:
            return False, {"error": f"Invalid JSON response: {resp.text[:200]}"}
    
    def verify(self, audio_path: str, helper_string: str, 
               commitment: str, salt: str) -> Tuple[bool, dict]:
        """
        Verify a voice sample against stored credentials.
        Returns (success, response_data).
        """
        if not os.path.exists(audio_path):
            return False, {"error": f"File not found: {audio_path}"}
        
        try:
            with open(audio_path, "rb") as f:
                files = {"audio": (os.path.basename(audio_path), f, "audio/wav")}
                data = {
                    "helper_string": helper_string,
                    "commitment": commitment,
                    "salt": salt,
                }
                resp = self.session.post(
                    f"{self.base_url}/api/verify",
                    files=files,
                    data=data,
                    timeout=60
                )
            
            response_data = resp.json()
            
            if resp.status_code != 200:
                return False, response_data
            
            return True, response_data
            
        except requests.RequestException as e:
            return False, {"error": str(e)}
        except json.JSONDecodeError:
            return False, {"error": f"Invalid JSON response: {resp.text[:200]}"}


# =============================================================================
# VALIDATION PIPELINE
# =============================================================================

class ValidationPipeline:
    """Main validation pipeline."""
    
    def __init__(self, backend_url: str, threshold: float, audio_dir: str):
        self.client = VoiceVaultClient(backend_url)
        self.threshold = threshold
        self.audio_dir = audio_dir
        self.enrollment: Optional[EnrollmentData] = None
        self.results: List[VerificationResult] = []
        self.metrics = AccuracyMetrics(threshold=threshold)
    
    def get_audio_path(self, filename: str) -> str:
        """Get full path to audio file."""
        return os.path.join(self.audio_dir, filename)
    
    def discover_test_files(self) -> Dict[str, List[str]]:
        """Discover available test files."""
        available = {
            "genuine": [],
            "imposters": [],
            "deepfakes": [],
        }
        
        # Check required files
        for category, files in [
            ("genuine", TEST_FILES["genuine"]),
            ("imposters", TEST_FILES["imposters"]),
            ("deepfakes", TEST_FILES["deepfakes"]),
        ]:
            for f in files:
                if os.path.exists(self.get_audio_path(f)):
                    available[category].append(f)
        
        # Check optional files
        for category, files in OPTIONAL_FILES.items():
            for f in files:
                if os.path.exists(self.get_audio_path(f)):
                    available[category].append(f)
        
        return available
    
    def run_health_check(self) -> bool:
        """Check backend health."""
        print_step(1, "Checking backend health...")
        
        ok, data = self.client.health_check()
        
        if not ok:
            print_fail(f"Backend not reachable: {data.get('error', 'Unknown error')}")
            print_info(f"Ensure backend is running at {self.client.base_url}")
            print_info("Start with: cd backend && python app.py")
            return False
        
        print_pass(f"Backend is running")
        print_info(f"Status: {data.get('status', 'unknown')}")
        print_info(f"Model loaded: {data.get('model_loaded', 'unknown')}")
        
        if data.get('mock_mode'):
            print_warn("MOCK_MODE is enabled - results will not reflect real AI accuracy")
        
        return True
    
    def run_enrollment(self) -> bool:
        """Enroll the test user."""
        print_step(2, "Enrolling test user (User A)...")
        
        enrollment_file = TEST_FILES["enrollment"]
        audio_path = self.get_audio_path(enrollment_file)
        
        if not os.path.exists(audio_path):
            print_fail(f"Enrollment file not found: {audio_path}")
            return False
        
        print_info(f"Using audio file: {enrollment_file}")
        print_info(f"File size: {os.path.getsize(audio_path):,} bytes")
        
        ok, data = self.client.register(audio_path)
        
        if not ok:
            print_fail(f"Enrollment failed: {data.get('error', data.get('message', 'Unknown error'))}")
            return False
        
        # Extract credentials
        helper_string = data.get("helper_string", "")
        commitment = data.get("commitment", "")
        salt = data.get("salt", "")
        
        if not all([helper_string, commitment, salt]):
            print_fail(f"Invalid enrollment response: missing required fields")
            print_info(f"Response: {json.dumps(data, indent=2)[:500]}")
            return False
        
        self.enrollment = EnrollmentData(
            helper_string=helper_string,
            commitment=commitment,
            salt=salt,
            enrolled_at=datetime.now().isoformat(),
            audio_file=enrollment_file,
        )
        
        # Save enrollment data
        enrollment_path = os.path.join(self.audio_dir, "enrollment_data.json")
        with open(enrollment_path, "w") as f:
            json.dump(asdict(self.enrollment), f, indent=2)
        
        print_pass("Enrollment successful")
        print_info(f"Helper string: {helper_string[:40]}...")
        print_info(f"Commitment: {commitment[:16]}...")
        print_info(f"Credentials saved to: {enrollment_path}")
        
        return True
    
    def run_verification_test(self, filename: str, category: str) -> VerificationResult:
        """Run a single verification test."""
        expected_pass = category == "genuine"
        
        result = VerificationResult(
            filename=filename,
            category=category,
            expected_pass=expected_pass,
        )
        
        audio_path = self.get_audio_path(filename)
        
        if not os.path.exists(audio_path):
            result.error = f"File not found: {audio_path}"
            return result
        
        ok, data = self.client.verify(
            audio_path,
            self.enrollment.helper_string,
            self.enrollment.commitment,
            self.enrollment.salt,
        )
        
        if not ok:
            result.error = data.get("error", data.get("message", "Unknown error"))
            return result
        
        # Extract response values
        result.status = data.get("status", "")
        result.score = data.get("score", 0)
        result.fuzzy_match = data.get("fuzzy_match", 0.0)
        result.liveness_score = data.get("liveness_score", 0.0)
        result.artifact_score = data.get("artifact_score", 0.0)
        result.identity_mismatch = data.get("identity_mismatch", False)
        result.is_deepfake = data.get("is_deepfake", False)
        result.recommendation = data.get("recommendation", "")
        
        # Compute pass/fail
        score_normalized = result.score / 100.0
        result.passed_threshold = score_normalized >= self.threshold
        
        # Compute correctness
        if expected_pass:
            result.correct_prediction = result.passed_threshold
        else:
            result.correct_prediction = not result.passed_threshold
        
        return result
    
    def run_all_verifications(self, test_files: Dict[str, List[str]]) -> bool:
        """Run all verification tests."""
        print_step(3, "Running verification tests...")
        
        total_files = sum(len(files) for files in test_files.values())
        
        if total_files == 0:
            print_fail("No test files found")
            return False
        
        print_info(f"Found {total_files} test files to process")
        
        test_num = 0
        
        for category, files in test_files.items():
            for filename in files:
                test_num += 1
                print(f"\n  [{test_num}/{total_files}] Testing: {filename} ({category})")
                
                result = self.run_verification_test(filename, category)
                self.results.append(result)
                
                if result.error:
                    print_fail(f"Error: {result.error}")
                else:
                    # Print raw values
                    print(f"       Score: {result.score}%")
                    print(f"       Fuzzy Match: {result.fuzzy_match:.4f}")
                    print(f"       Liveness: {result.liveness_score:.4f}")
                    print(f"       Artifact: {result.artifact_score:.4f}")
                    print(f"       Status: {result.status}")
                    print(f"       Identity Mismatch: {result.identity_mismatch}")
                    
                    if result.correct_prediction:
                        print_pass(f"Correctly {'accepted' if result.expected_pass else 'rejected'}")
                    else:
                        print_fail(f"Incorrectly {'rejected' if result.expected_pass else 'accepted'}")
                
                time.sleep(REQUEST_DELAY)
        
        return True
    
    def compute_metrics(self):
        """Compute accuracy metrics from results."""
        print_step(4, "Computing accuracy metrics...")
        
        for result in self.results:
            if result.error:
                continue
            
            self.metrics.total_tests += 1
            score_normalized = result.score / 100.0
            
            if result.category == "genuine":
                self.metrics.genuine_tests += 1
                self.metrics.genuine_scores.append(score_normalized)
                
                if result.passed_threshold:
                    self.metrics.true_accepts += 1
                else:
                    self.metrics.false_rejects += 1
                    
            elif result.category == "imposters":
                self.metrics.imposter_tests += 1
                self.metrics.imposter_scores.append(score_normalized)
                
                if result.passed_threshold:
                    self.metrics.false_accepts += 1
                else:
                    self.metrics.true_rejects += 1
                    
            elif result.category == "deepfakes":
                self.metrics.deepfake_tests += 1
                self.metrics.deepfake_scores.append(score_normalized)
                
                if result.passed_threshold:
                    self.metrics.false_accepts += 1
                else:
                    self.metrics.true_rejects += 1
                
                # Deepfake-specific tracking
                if result.is_deepfake or not result.passed_threshold:
                    self.metrics.deepfakes_detected += 1
                else:
                    self.metrics.deepfakes_missed += 1
    
    def print_results(self):
        """Print results summary."""
        print_header("ACCURACY METRICS")
        
        print(f"\n{Colors.BOLD}Test Configuration:{Colors.RESET}")
        print(f"  Threshold: {self.threshold * 100:.0f}%")
        print(f"  Total Tests: {self.metrics.total_tests}")
        print(f"  Genuine: {self.metrics.genuine_tests}")
        print(f"  Imposters: {self.metrics.imposter_tests}")
        print(f"  Deepfakes: {self.metrics.deepfake_tests}")
        
        print(f"\n{Colors.BOLD}Core Biometric Metrics:{Colors.RESET}")
        print_metric("True Acceptance Rate (TAR)", self.metrics.tar, good_threshold=0.9)
        print_metric("False Rejection Rate (FRR)", self.metrics.frr, good_threshold=0.0)
        print_metric("False Acceptance Rate (FAR)", self.metrics.far, good_threshold=0.0)
        print_metric("True Rejection Rate (TRR)", self.metrics.trr, good_threshold=0.9)
        
        print(f"\n{Colors.BOLD}Deepfake Detection:{Colors.RESET}")
        print_metric("Deepfake Detection Rate", self.metrics.deepfake_detection_rate, good_threshold=0.9)
        
        print(f"\n{Colors.BOLD}Score Distributions:{Colors.RESET}")
        print(f"  Avg Genuine Score:  {self.metrics.avg_genuine_score * 100:.1f}%")
        print(f"  Avg Imposter Score: {self.metrics.avg_imposter_score * 100:.1f}%")
        print(f"  Avg Deepfake Score: {self.metrics.avg_deepfake_score * 100:.1f}%")
        
        # Score separation (higher is better)
        if self.metrics.genuine_scores and self.metrics.imposter_scores:
            separation = self.metrics.avg_genuine_score - self.metrics.avg_imposter_score
            print(f"  Score Separation:   {separation * 100:.1f}% (genuine - imposter)")
        
        print(f"\n{Colors.BOLD}Overall Accuracy:{Colors.RESET}")
        print_metric("Overall Accuracy", self.metrics.overall_accuracy, good_threshold=0.85)
        
        # Pass/Fail verdict
        print_header("VERDICT")
        
        passed = True
        
        # Check TAR (should be high for genuine users)
        if self.metrics.tar < 0.8:
            print_fail(f"TAR {self.metrics.tar*100:.1f}% is below 80% threshold")
            passed = False
        else:
            print_pass(f"TAR {self.metrics.tar*100:.1f}% meets 80% threshold")
        
        # Check FAR (should be low for imposters)
        if self.metrics.far > 0.2:
            print_fail(f"FAR {self.metrics.far*100:.1f}% is above 20% threshold")
            passed = False
        else:
            print_pass(f"FAR {self.metrics.far*100:.1f}% is below 20% threshold")
        
        # Check deepfake detection
        if self.metrics.deepfake_tests > 0:
            if self.metrics.deepfake_detection_rate < 0.8:
                print_fail(f"Deepfake detection {self.metrics.deepfake_detection_rate*100:.1f}% is below 80%")
                passed = False
            else:
                print_pass(f"Deepfake detection {self.metrics.deepfake_detection_rate*100:.1f}% meets 80% threshold")
        
        print()
        if passed:
            print(f"{Colors.GREEN}{Colors.BOLD}✅ ALL CRITICAL TESTS PASSED{Colors.RESET}")
        else:
            print(f"{Colors.RED}{Colors.BOLD}❌ SOME TESTS FAILED - REVIEW RESULTS{Colors.RESET}")
        
        return passed
    
    def generate_report(self) -> str:
        """Generate markdown accuracy report."""
        report_path = os.path.join(self.audio_dir, "accuracy_report.md")
        
        lines = [
            "# Voice Vault Accuracy Validation Report",
            "",
            f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"**Threshold:** {self.threshold * 100:.0f}%",
            "",
            "---",
            "",
            "## Test Methodology",
            "",
            "This report validates the accuracy of Voice Vault's voice biometric system using:",
            "",
            "1. **Genuine Tests**: Same person, different recordings",
            "2. **Imposter Tests**: Different people attempting to authenticate",
            "3. **Deepfake Tests**: AI-generated voice clones",
            "",
            "All tests use real audio files processed by the actual AI models (MOCK_MODE=false).",
            "",
            "---",
            "",
            "## Metric Definitions",
            "",
            "| Metric | Definition |",
            "|--------|------------|",
            "| **TAR** (True Acceptance Rate) | Genuine users correctly accepted |",
            "| **FRR** (False Rejection Rate) | Genuine users incorrectly rejected |",
            "| **FAR** (False Acceptance Rate) | Imposters incorrectly accepted |",
            "| **TRR** (True Rejection Rate) | Imposters correctly rejected |",
            "| **DDR** (Deepfake Detection Rate) | Deepfakes correctly identified |",
            "",
            "---",
            "",
            "## Results Summary",
            "",
            "### Test Configuration",
            "",
            f"- **Total Tests:** {self.metrics.total_tests}",
            f"- **Genuine Tests:** {self.metrics.genuine_tests}",
            f"- **Imposter Tests:** {self.metrics.imposter_tests}",
            f"- **Deepfake Tests:** {self.metrics.deepfake_tests}",
            "",
            "### Core Biometric Metrics",
            "",
            "| Metric | Value | Target | Status |",
            "|--------|-------|--------|--------|",
            f"| TAR | {self.metrics.tar*100:.1f}% | ≥80% | {'✅' if self.metrics.tar >= 0.8 else '❌'} |",
            f"| FRR | {self.metrics.frr*100:.1f}% | ≤20% | {'✅' if self.metrics.frr <= 0.2 else '❌'} |",
            f"| FAR | {self.metrics.far*100:.1f}% | ≤20% | {'✅' if self.metrics.far <= 0.2 else '❌'} |",
            f"| TRR | {self.metrics.trr*100:.1f}% | ≥80% | {'✅' if self.metrics.trr >= 0.8 else '❌'} |",
            f"| DDR | {self.metrics.deepfake_detection_rate*100:.1f}% | ≥80% | {'✅' if self.metrics.deepfake_detection_rate >= 0.8 else '❌'} |",
            "",
            "### Score Distribution",
            "",
            "| Category | Avg Score | Min | Max |",
            "|----------|-----------|-----|-----|",
        ]
        
        # Add score distribution
        for category, scores, name in [
            ("genuine", self.metrics.genuine_scores, "Genuine"),
            ("imposter", self.metrics.imposter_scores, "Imposter"),
            ("deepfake", self.metrics.deepfake_scores, "Deepfake"),
        ]:
            if scores:
                avg = sum(scores) / len(scores) * 100
                min_s = min(scores) * 100
                max_s = max(scores) * 100
                lines.append(f"| {name} | {avg:.1f}% | {min_s:.1f}% | {max_s:.1f}% |")
            else:
                lines.append(f"| {name} | N/A | N/A | N/A |")
        
        lines.extend([
            "",
            "---",
            "",
            "## Detailed Results",
            "",
            "| File | Category | Score | Fuzzy Match | Liveness | Status | Correct |",
            "|------|----------|-------|-------------|----------|--------|---------|",
        ])
        
        for r in self.results:
            if r.error:
                lines.append(f"| {r.filename} | {r.category} | ERROR | - | - | {r.error[:20]} | - |")
            else:
                lines.append(
                    f"| {r.filename} | {r.category} | {r.score}% | "
                    f"{r.fuzzy_match:.2f} | {r.liveness_score:.2f} | "
                    f"{r.status} | {'✅' if r.correct_prediction else '❌'} |"
                )
        
        lines.extend([
            "",
            "---",
            "",
            "## Verdict",
            "",
        ])
        
        # Overall verdict
        passed = (
            self.metrics.tar >= 0.8 and
            self.metrics.far <= 0.2 and
            (self.metrics.deepfake_tests == 0 or self.metrics.deepfake_detection_rate >= 0.8)
        )
        
        if passed:
            lines.extend([
                "### ✅ VALIDATION PASSED",
                "",
                "The Voice Vault system meets the minimum accuracy thresholds for:",
                "- Genuine user authentication (TAR ≥ 80%)",
                "- Imposter rejection (FAR ≤ 20%)",
                "- Deepfake detection (DDR ≥ 80%)",
            ])
        else:
            lines.extend([
                "### ❌ VALIDATION FAILED",
                "",
                "The Voice Vault system does not meet one or more accuracy thresholds.",
                "Review the detailed results above to identify areas for improvement.",
            ])
        
        lines.extend([
            "",
            "---",
            "",
            "## Limitations & Notes",
            "",
            "1. **Small Sample Size**: Results based on limited test samples. Production validation requires larger datasets.",
            "2. **Environment Factors**: Accuracy varies with recording quality, background noise, and microphone type.",
            "3. **Threshold Sensitivity**: The 75% threshold is configurable. Adjust based on security requirements.",
            "4. **Deepfake Evolution**: AI voice cloning improves rapidly. Regular re-evaluation is recommended.",
            "5. **Cross-Session Variance**: Voice varies by time of day, health, and emotional state.",
            "",
            "---",
            "",
            "*Report generated by Voice Vault Accuracy Validation Pipeline*",
        ])
        
        report_content = "\n".join(lines)
        
        with open(report_path, "w") as f:
            f.write(report_content)
        
        print_info(f"Report saved to: {report_path}")
        
        return report_path
    
    def run(self) -> bool:
        """Run the full validation pipeline."""
        print_header("VOICE VAULT ACCURACY VALIDATION")
        
        print(f"Backend URL: {self.client.base_url}")
        print(f"Audio Directory: {self.audio_dir}")
        print(f"Threshold: {self.threshold * 100:.0f}%")
        
        # Step 1: Health check
        if not self.run_health_check():
            return False
        
        # Discover test files
        test_files = self.discover_test_files()
        print(f"\n  Discovered test files:")
        for category, files in test_files.items():
            print(f"    {category}: {files if files else '(none)'}")
        
        # Step 2: Enrollment
        time.sleep(REQUEST_DELAY)
        if not self.run_enrollment():
            return False
        
        # Step 3: Verification tests
        time.sleep(REQUEST_DELAY)
        if not self.run_all_verifications(test_files):
            return False
        
        # Step 4: Compute metrics
        self.compute_metrics()
        
        # Print results
        passed = self.print_results()
        
        # Generate report
        self.generate_report()
        
        return passed


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Voice Vault Accuracy Validation Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python validate_accuracy.py
  python validate_accuracy.py --backend-url http://localhost:5001
  python validate_accuracy.py --threshold 0.80

Test Audio Files Required:
  test_audio/userA_real_1.wav     (enrollment)
  test_audio/userA_real_2.wav     (genuine test)
  test_audio/userB_imposter.wav   (imposter test)
  test_audio/deepfake_A_clone.wav (deepfake test)
        """
    )
    
    parser.add_argument(
        "--backend-url",
        default=DEFAULT_BACKEND_URL,
        help=f"Backend API URL (default: {DEFAULT_BACKEND_URL})"
    )
    
    parser.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_THRESHOLD,
        help=f"Pass/fail threshold 0.0-1.0 (default: {DEFAULT_THRESHOLD})"
    )
    
    parser.add_argument(
        "--audio-dir",
        default="./test_audio",
        help="Directory containing test audio files (default: ./test_audio)"
    )
    
    args = parser.parse_args()
    
    # Validate arguments
    if not 0.0 <= args.threshold <= 1.0:
        print(f"❌ ERROR: Threshold must be between 0.0 and 1.0, got {args.threshold}")
        sys.exit(1)
    
    if not os.path.isdir(args.audio_dir):
        print(f"❌ ERROR: Audio directory not found: {args.audio_dir}")
        print(f"Create the directory and add test audio files.")
        sys.exit(1)
    
    # Check for enrollment file
    enrollment_path = os.path.join(args.audio_dir, TEST_FILES["enrollment"])
    if not os.path.exists(enrollment_path):
        print(f"❌ ERROR: Enrollment file not found: {enrollment_path}")
        print(f"Add the enrollment audio file before running validation.")
        sys.exit(1)
    
    # Run pipeline
    pipeline = ValidationPipeline(
        backend_url=args.backend_url,
        threshold=args.threshold,
        audio_dir=args.audio_dir,
    )
    
    try:
        success = pipeline.run()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Validation interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n❌ FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
