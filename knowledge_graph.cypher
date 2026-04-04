MATCH (n) DETACH DELETE n;

CREATE (p:Project {
            name: 'VoiceVault',
            description: 'Voice biometric authentication system using AI and blockchain',
            type: 'Full-stack Application',
            created: datetime()
        });

MERGE (t:Technology {name: 'Librosa'})
            WITH t
            MATCH (p:Project {name: 'VoiceVault'})
            MERGE (p)-[:USES_TECHNOLOGY]->(t);

MERGE (t:Technology {name: 'Ethers.js'})
            WITH t
            MATCH (p:Project {name: 'VoiceVault'})
            MERGE (p)-[:USES_TECHNOLOGY]->(t);

MERGE (t:Technology {name: 'React'})
            WITH t
            MATCH (p:Project {name: 'VoiceVault'})
            MERGE (p)-[:USES_TECHNOLOGY]->(t);

MERGE (t:Technology {name: 'PyTorch'})
            WITH t
            MATCH (p:Project {name: 'VoiceVault'})
            MERGE (p)-[:USES_TECHNOLOGY]->(t);

MERGE (t:Technology {name: 'Solidity'})
            WITH t
            MATCH (p:Project {name: 'VoiceVault'})
            MERGE (p)-[:USES_TECHNOLOGY]->(t);

MERGE (t:Technology {name: 'Flask'})
            WITH t
            MATCH (p:Project {name: 'VoiceVault'})
            MERGE (p)-[:USES_TECHNOLOGY]->(t);

CREATE (c:Component {
                name: 'backend',
                type: 'backend',
                file_count: 5
            })
            WITH c
            MATCH (p:Project {name: 'VoiceVault'})
            MERGE (p)-[:HAS_COMPONENT]->(c);

CREATE (f:File:PythonFile {
                        path: 'backend/fuzzy_extractor.py',
                        name: 'fuzzy_extractor.py',
                        lines: 262,
                        functions: 1,
                        routes: 0
                    })
                    WITH f
                    MATCH (c:Component {name: 'backend'})
                    MERGE (c)-[:CONTAINS]->(f);

MERGE (fn:Function {name: 'create_fuzzy_extractor', file: 'backend/fuzzy_extractor.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/fuzzy_extractor.py'})
                        MERGE (f)-[:DEFINES]->(fn);

CREATE (f:File:PythonFile {
                        path: 'backend/chain_utils.py',
                        name: 'chain_utils.py',
                        lines: 137,
                        functions: 6,
                        routes: 0
                    })
                    WITH f
                    MATCH (c:Component {name: 'backend'})
                    MERGE (c)-[:CONTAINS]->(f);

MERGE (fn:Function {name: 'validate_address', file: 'backend/chain_utils.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/chain_utils.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'get_contract_abi', file: 'backend/chain_utils.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/chain_utils.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'get_web3', file: 'backend/chain_utils.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/chain_utils.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'get_contract', file: 'backend/chain_utils.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/chain_utils.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'get_voice_profile', file: 'backend/chain_utils.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/chain_utils.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'is_registered', file: 'backend/chain_utils.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/chain_utils.py'})
                        MERGE (f)-[:DEFINES]->(fn);

CREATE (f:File:PythonFile {
                        path: 'backend/deepfake_detector.py',
                        name: 'deepfake_detector.py',
                        lines: 528,
                        functions: 1,
                        routes: 0
                    })
                    WITH f
                    MATCH (c:Component {name: 'backend'})
                    MERGE (c)-[:CONTAINS]->(f);

MERGE (fn:Function {name: 'create_detector', file: 'backend/deepfake_detector.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/deepfake_detector.py'})
                        MERGE (f)-[:DEFINES]->(fn);

CREATE (f:File:PythonFile {
                        path: 'backend/app.py',
                        name: 'app.py',
                        lines: 1395,
                        functions: 24,
                        routes: 9
                    })
                    WITH f
                    MATCH (c:Component {name: 'backend'})
                    MERGE (c)-[:CONTAINS]->(f);

MERGE (fn:Function {name: 'after_request', file: 'backend/app.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'get_ai_components', file: 'backend/app.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'is_model_loaded', file: 'backend/app.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: '_is_main_thread', file: 'backend/app.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'timeout_context', file: 'backend/app.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'validate_ethereum_address', file: 'backend/app.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'validate_audio_file', file: 'backend/app.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'process_audio_in_memory', file: 'backend/app.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'cleanup_audio', file: 'backend/app.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'get_mock_embedding', file: 'backend/app.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'get_mock_enrollment', file: 'backend/app.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'get_mock_deepfake_analysis', file: 'backend/app.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'health_check', file: 'backend/app.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'handle_options', file: 'backend/app.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'get_profile', file: 'backend/app.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'register_voice', file: 'backend/app.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'verify_voice', file: 'backend/app.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'debug_similarity', file: 'backend/app.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'forensic_analysis', file: 'backend/app.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'detect_clone', file: 'backend/app.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'challenge_response', file: 'backend/app.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'not_found', file: 'backend/app.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'method_not_allowed', file: 'backend/app.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (fn:Function {name: 'internal_error', file: 'backend/app.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:DEFINES]->(fn);

MERGE (r:APIEndpoint {path: '/api/health', file: 'backend/app.py'})
                        WITH r
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:EXPOSES]->(r);

MERGE (r:APIEndpoint {path: '/api/<path:path>', file: 'backend/app.py'})
                        WITH r
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:EXPOSES]->(r);

MERGE (r:APIEndpoint {path: '/api/get_profile', file: 'backend/app.py'})
                        WITH r
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:EXPOSES]->(r);

MERGE (r:APIEndpoint {path: '/api/register', file: 'backend/app.py'})
                        WITH r
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:EXPOSES]->(r);

MERGE (r:APIEndpoint {path: '/api/verify', file: 'backend/app.py'})
                        WITH r
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:EXPOSES]->(r);

MERGE (r:APIEndpoint {path: '/api/debug_similarity', file: 'backend/app.py'})
                        WITH r
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:EXPOSES]->(r);

MERGE (r:APIEndpoint {path: '/api/forensic', file: 'backend/app.py'})
                        WITH r
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:EXPOSES]->(r);

MERGE (r:APIEndpoint {path: '/api/detect_clone', file: 'backend/app.py'})
                        WITH r
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:EXPOSES]->(r);

MERGE (r:APIEndpoint {path: '/api/challenge', file: 'backend/app.py'})
                        WITH r
                        MATCH (f:File {path: 'backend/app.py'})
                        MERGE (f)-[:EXPOSES]->(r);

CREATE (f:File:PythonFile {
                        path: 'backend/embedder.py',
                        name: 'embedder.py',
                        lines: 252,
                        functions: 1,
                        routes: 0
                    })
                    WITH f
                    MATCH (c:Component {name: 'backend'})
                    MERGE (c)-[:CONTAINS]->(f);

MERGE (fn:Function {name: 'get_embedder', file: 'backend/embedder.py'})
                        WITH fn
                        MATCH (f:File {path: 'backend/embedder.py'})
                        MERGE (f)-[:DEFINES]->(fn);

CREATE (c:Component {
                name: 'frontend',
                type: 'frontend',
                file_count: 17
            })
            WITH c
            MATCH (p:Project {name: 'VoiceVault'})
            MERGE (p)-[:HAS_COMPONENT]->(c);

CREATE (f:File:JavaScriptFile {
                        path: 'frontend/src/main.jsx',
                        name: 'main.jsx',
                        lines: 11,
                        components: 0
                    })
                    WITH f
                    MATCH (c:Component {name: 'frontend'})
                    MERGE (c)-[:CONTAINS]->(f);

CREATE (f:File:JavaScriptFile {
                        path: 'frontend/src/App.jsx',
                        name: 'App.jsx',
                        lines: 150,
                        components: 6
                    })
                    WITH f
                    MATCH (c:Component {name: 'frontend'})
                    MERGE (c)-[:CONTAINS]->(f);

MERGE (rc:ReactComponent {name: 'LoadingSkeleton', file: 'frontend/src/App.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/App.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

MERGE (rc:ReactComponent {name: 'CardSkeleton', file: 'frontend/src/App.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/App.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

MERGE (rc:ReactComponent {name: 'BackendBanner', file: 'frontend/src/App.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/App.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

MERGE (rc:ReactComponent {name: 'Footer', file: 'frontend/src/App.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/App.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

MERGE (rc:ReactComponent {name: 'Layout', file: 'frontend/src/App.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/App.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

MERGE (rc:ReactComponent {name: 'App', file: 'frontend/src/App.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/App.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

CREATE (f:File:JavaScriptFile {
                        path: 'frontend/src/utils/api.js',
                        name: 'api.js',
                        lines: 140,
                        components: 0
                    })
                    WITH f
                    MATCH (c:Component {name: 'frontend'})
                    MERGE (c)-[:CONTAINS]->(f);

CREATE (f:File:JavaScriptFile {
                        path: 'frontend/src/utils/contracts.js',
                        name: 'contracts.js',
                        lines: 53,
                        components: 0
                    })
                    WITH f
                    MATCH (c:Component {name: 'frontend'})
                    MERGE (c)-[:CONTAINS]->(f);

CREATE (f:File:JavaScriptFile {
                        path: 'frontend/src/abi/VoiceIDSBT.json',
                        name: 'VoiceIDSBT.json',
                        lines: 491,
                        components: 0
                    })
                    WITH f
                    MATCH (c:Component {name: 'frontend'})
                    MERGE (c)-[:CONTAINS]->(f);

CREATE (f:File:JavaScriptFile {
                        path: 'frontend/src/abi/VoiceVault.json',
                        name: 'VoiceVault.json',
                        lines: 298,
                        components: 0
                    })
                    WITH f
                    MATCH (c:Component {name: 'frontend'})
                    MERGE (c)-[:CONTAINS]->(f);

CREATE (f:File:JavaScriptFile {
                        path: 'frontend/src/abi/FraudRegistry.json',
                        name: 'FraudRegistry.json',
                        lines: 275,
                        components: 0
                    })
                    WITH f
                    MATCH (c:Component {name: 'frontend'})
                    MERGE (c)-[:CONTAINS]->(f);

CREATE (f:File:JavaScriptFile {
                        path: 'frontend/src/components/AudioRecorder.jsx',
                        name: 'AudioRecorder.jsx',
                        lines: 415,
                        components: 1
                    })
                    WITH f
                    MATCH (c:Component {name: 'frontend'})
                    MERGE (c)-[:CONTAINS]->(f);

MERGE (rc:ReactComponent {name: 'AudioRecorder', file: 'frontend/src/components/AudioRecorder.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/components/AudioRecorder.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

CREATE (f:File:JavaScriptFile {
                        path: 'frontend/src/components/Navbar.jsx',
                        name: 'Navbar.jsx',
                        lines: 112,
                        components: 1
                    })
                    WITH f
                    MATCH (c:Component {name: 'frontend'})
                    MERGE (c)-[:CONTAINS]->(f);

MERGE (rc:ReactComponent {name: 'Navbar', file: 'frontend/src/components/Navbar.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/components/Navbar.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

CREATE (f:File:JavaScriptFile {
                        path: 'frontend/src/hooks/useWallet.js',
                        name: 'useWallet.js',
                        lines: 140,
                        components: 0
                    })
                    WITH f
                    MATCH (c:Component {name: 'frontend'})
                    MERGE (c)-[:CONTAINS]->(f);

CREATE (f:File:JavaScriptFile {
                        path: 'frontend/src/hooks/useVoiceRegistration.js',
                        name: 'useVoiceRegistration.js',
                        lines: 71,
                        components: 0
                    })
                    WITH f
                    MATCH (c:Component {name: 'frontend'})
                    MERGE (c)-[:CONTAINS]->(f);

CREATE (f:File:JavaScriptFile {
                        path: 'frontend/src/pages/MyIdentityPage.jsx',
                        name: 'MyIdentityPage.jsx',
                        lines: 272,
                        components: 4
                    })
                    WITH f
                    MATCH (c:Component {name: 'frontend'})
                    MERGE (c)-[:CONTAINS]->(f);

MERGE (rc:ReactComponent {name: 'LoadingSkeleton', file: 'frontend/src/pages/MyIdentityPage.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/pages/MyIdentityPage.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

MERGE (rc:ReactComponent {name: 'Spinner', file: 'frontend/src/pages/MyIdentityPage.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/pages/MyIdentityPage.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

MERGE (rc:ReactComponent {name: 'ConfirmModal', file: 'frontend/src/pages/MyIdentityPage.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/pages/MyIdentityPage.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

MERGE (rc:ReactComponent {name: 'MyIdentityPage', file: 'frontend/src/pages/MyIdentityPage.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/pages/MyIdentityPage.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

CREATE (f:File:JavaScriptFile {
                        path: 'frontend/src/pages/VerifyPage.jsx',
                        name: 'VerifyPage.jsx',
                        lines: 675,
                        components: 8
                    })
                    WITH f
                    MATCH (c:Component {name: 'frontend'})
                    MERGE (c)-[:CONTAINS]->(f);

MERGE (rc:ReactComponent {name: 'LoadingSkeleton', file: 'frontend/src/pages/VerifyPage.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/pages/VerifyPage.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

MERGE (rc:ReactComponent {name: 'Spinner', file: 'frontend/src/pages/VerifyPage.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/pages/VerifyPage.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

MERGE (rc:ReactComponent {name: 'TabButton', file: 'frontend/src/pages/VerifyPage.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/pages/VerifyPage.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

MERGE (rc:ReactComponent {name: 'SubTabButton', file: 'frontend/src/pages/VerifyPage.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/pages/VerifyPage.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

MERGE (rc:ReactComponent {name: 'ResultCard', file: 'frontend/src/pages/VerifyPage.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/pages/VerifyPage.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

MERGE (rc:ReactComponent {name: 'ResultTable', file: 'frontend/src/pages/VerifyPage.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/pages/VerifyPage.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

MERGE (rc:ReactComponent {name: 'ForensicReport', file: 'frontend/src/pages/VerifyPage.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/pages/VerifyPage.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

MERGE (rc:ReactComponent {name: 'VerifyPage', file: 'frontend/src/pages/VerifyPage.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/pages/VerifyPage.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

CREATE (f:File:JavaScriptFile {
                        path: 'frontend/src/pages/RegisterPage.jsx',
                        name: 'RegisterPage.jsx',
                        lines: 347,
                        components: 4
                    })
                    WITH f
                    MATCH (c:Component {name: 'frontend'})
                    MERGE (c)-[:CONTAINS]->(f);

MERGE (rc:ReactComponent {name: 'StepIndicator', file: 'frontend/src/pages/RegisterPage.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/pages/RegisterPage.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

MERGE (rc:ReactComponent {name: 'Spinner', file: 'frontend/src/pages/RegisterPage.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/pages/RegisterPage.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

MERGE (rc:ReactComponent {name: 'SuccessCheckmark', file: 'frontend/src/pages/RegisterPage.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/pages/RegisterPage.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

MERGE (rc:ReactComponent {name: 'RegisterPage', file: 'frontend/src/pages/RegisterPage.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/pages/RegisterPage.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

CREATE (f:File:JavaScriptFile {
                        path: 'frontend/src/pages/ZKDemoPage.jsx',
                        name: 'ZKDemoPage.jsx',
                        lines: 198,
                        components: 2
                    })
                    WITH f
                    MATCH (c:Component {name: 'frontend'})
                    MERGE (c)-[:CONTAINS]->(f);

MERGE (rc:ReactComponent {name: 'Spinner', file: 'frontend/src/pages/ZKDemoPage.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/pages/ZKDemoPage.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

MERGE (rc:ReactComponent {name: 'ZKDemoPage', file: 'frontend/src/pages/ZKDemoPage.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/pages/ZKDemoPage.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

CREATE (f:File:JavaScriptFile {
                        path: 'frontend/src/pages/LandingPage.jsx',
                        name: 'LandingPage.jsx',
                        lines: 230,
                        components: 1
                    })
                    WITH f
                    MATCH (c:Component {name: 'frontend'})
                    MERGE (c)-[:CONTAINS]->(f);

MERGE (rc:ReactComponent {name: 'LandingPage', file: 'frontend/src/pages/LandingPage.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/pages/LandingPage.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

CREATE (f:File:JavaScriptFile {
                        path: 'frontend/src/pages/FraudRegistryPage.jsx',
                        name: 'FraudRegistryPage.jsx',
                        lines: 358,
                        components: 4
                    })
                    WITH f
                    MATCH (c:Component {name: 'frontend'})
                    MERGE (c)-[:CONTAINS]->(f);

MERGE (rc:ReactComponent {name: 'TableSkeleton', file: 'frontend/src/pages/FraudRegistryPage.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/pages/FraudRegistryPage.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

MERGE (rc:ReactComponent {name: 'Spinner', file: 'frontend/src/pages/FraudRegistryPage.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/pages/FraudRegistryPage.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

MERGE (rc:ReactComponent {name: 'RiskBadge', file: 'frontend/src/pages/FraudRegistryPage.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/pages/FraudRegistryPage.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

MERGE (rc:ReactComponent {name: 'FraudRegistryPage', file: 'frontend/src/pages/FraudRegistryPage.jsx'})
                        WITH rc
                        MATCH (f:File {path: 'frontend/src/pages/FraudRegistryPage.jsx'})
                        MERGE (f)-[:DEFINES]->(rc);

CREATE (c:Component {
                name: 'blockchain',
                type: 'blockchain',
                file_count: 3
            })
            WITH c
            MATCH (p:Project {name: 'VoiceVault'})
            MERGE (p)-[:HAS_COMPONENT]->(c);

CREATE (f:File:SolidityFile {
                        path: 'blockchain/contracts/FraudRegistry.sol',
                        name: 'FraudRegistry.sol',
                        lines: 111,
                        contracts: 1
                    })
                    WITH f
                    MATCH (c:Component {name: 'blockchain'})
                    MERGE (c)-[:CONTAINS]->(f);

MERGE (sc:SmartContract {name: 'FraudRegistry', file: 'blockchain/contracts/FraudRegistry.sol'})
                        WITH sc
                        MATCH (f:File {path: 'blockchain/contracts/FraudRegistry.sol'})
                        MERGE (f)-[:DEFINES]->(sc);

CREATE (f:File:SolidityFile {
                        path: 'blockchain/contracts/VoiceIDSBT.sol',
                        name: 'VoiceIDSBT.sol',
                        lines: 143,
                        contracts: 1
                    })
                    WITH f
                    MATCH (c:Component {name: 'blockchain'})
                    MERGE (c)-[:CONTAINS]->(f);

MERGE (sc:SmartContract {name: 'VoiceIDSBT', file: 'blockchain/contracts/VoiceIDSBT.sol'})
                        WITH sc
                        MATCH (f:File {path: 'blockchain/contracts/VoiceIDSBT.sol'})
                        MERGE (f)-[:DEFINES]->(sc);

CREATE (f:File:SolidityFile {
                        path: 'blockchain/contracts/VoiceVault.sol',
                        name: 'VoiceVault.sol',
                        lines: 177,
                        contracts: 1
                    })
                    WITH f
                    MATCH (c:Component {name: 'blockchain'})
                    MERGE (c)-[:CONTAINS]->(f);

MERGE (sc:SmartContract {name: 'VoiceVault', file: 'blockchain/contracts/VoiceVault.sol'})
                        WITH sc
                        MATCH (f:File {path: 'blockchain/contracts/VoiceVault.sol'})
                        MERGE (f)-[:DEFINES]->(sc);

// Voice Registration Flow
        CREATE (flow1:DataFlow {
            name: 'Voice Registration',
            steps: 'Audio Recording → Feature Extraction → Fuzzy Hashing → Blockchain Storage'
        })
        WITH flow1
        MATCH (p:Project {name: 'VoiceVault'})
        MERGE (p)-[:HAS_FLOW]->(flow1);

// Voice Verification Flow
        CREATE (flow2:DataFlow {
            name: 'Voice Verification',
            steps: 'Audio Recording → Feature Extraction → Cosine Similarity → Deepfake Detection → Score Calculation'
        })
        WITH flow2
        MATCH (p:Project {name: 'VoiceVault'})
        MERGE (p)-[:HAS_FLOW]->(flow2);

