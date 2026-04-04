#!/usr/bin/env python3
"""
VoiceVault Knowledge Graph Creator
Creates comprehensive Neo4j graph from codebase audit
"""

import os
import json
import re
from pathlib import Path
from typing import Dict, List, Set, Tuple
import subprocess

class VoiceVaultAuditor:
    def __init__(self, root_path: str):
        self.root = Path(root_path)
        self.components = {}
        self.relationships = []
        self.functions = {}
        self.apis = {}
        self.technologies = set()
        
    def analyze_python_file(self, filepath: Path) -> Dict:
        """Analyze a Python file for functions, imports, and dependencies"""
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract imports
        imports = re.findall(r'^(?:from|import)\s+([\w.]+)', content, re.MULTILINE)
        
        # Extract function definitions
        functions = re.findall(r'^def\s+(\w+)\s*\(([^)]*)\)', content, re.MULTILINE)
        
        # Extract class definitions
        classes = re.findall(r'^class\s+(\w+)', content, re.MULTILINE)
        
        # Extract decorators (Flask routes, etc.)
        routes = re.findall(r"@app\.route\(['\"]([^'\"]+)['\"]", content)
        
        return {
            'filepath': str(filepath.relative_to(self.root)),
            'imports': imports,
            'functions': [f[0] for f in functions],
            'classes': classes,
            'routes': routes,
            'lines': len(content.split('\n'))
        }
    
    def analyze_javascript_file(self, filepath: Path) -> Dict:
        """Analyze JavaScript/JSX file"""
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract imports
        imports = re.findall(r"import\s+.*?from\s+['\"]([^'\"]+)['\"]", content)
        
        # Extract functions
        functions = re.findall(r'(?:function|const|let|var)\s+(\w+)\s*=?\s*(?:\([^)]*\)|async)', content)
        
        # Extract React components
        components = re.findall(r'(?:function|const)\s+([A-Z]\w+)\s*=?\s*\(', content)
        
        # Extract API calls
        api_calls = re.findall(r"(?:fetch|axios\.\w+)\(['\"]([^'\"]+)['\"]", content)
        
        return {
            'filepath': str(filepath.relative_to(self.root)),
            'imports': imports,
            'functions': functions,
            'components': components,
            'api_calls': api_calls,
            'lines': len(content.split('\n'))
        }
    
    def analyze_solidity_file(self, filepath: Path) -> Dict:
        """Analyze Solidity smart contract"""
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract contract name
        contracts = re.findall(r'contract\s+(\w+)', content)
        
        # Extract functions
        functions = re.findall(r'function\s+(\w+)\s*\([^)]*\)', content)
        
        # Extract events
        events = re.findall(r'event\s+(\w+)\s*\(', content)
        
        # Extract modifiers
        modifiers = re.findall(r'modifier\s+(\w+)', content)
        
        return {
            'filepath': str(filepath.relative_to(self.root)),
            'contracts': contracts,
            'functions': functions,
            'events': events,
            'modifiers': modifiers,
            'lines': len(content.split('\n'))
        }
    
    def scan_project(self):
        """Scan entire project"""
        print("Scanning VoiceVault project...")
        
        # Backend analysis
        backend_files = list((self.root / 'backend').glob('*.py'))
        self.components['backend'] = {
            'files': []
        }
        
        for file in backend_files:
            if file.name != '__init__.py':
                analysis = self.analyze_python_file(file)
                self.components['backend']['files'].append(analysis)
                
                # Track technologies
                for imp in analysis['imports']:
                    if 'flask' in imp.lower():
                        self.technologies.add('Flask')
                    elif 'torch' in imp.lower():
                        self.technologies.add('PyTorch')
                    elif 'speechbrain' in imp.lower():
                        self.technologies.add('SpeechBrain')
                    elif 'librosa' in imp.lower():
                        self.technologies.add('Librosa')
        
        # Frontend analysis
        frontend_src = self.root / 'frontend' / 'src'
        if frontend_src.exists():
            self.components['frontend'] = {
                'files': []
            }
            
            for file in frontend_src.rglob('*.js*'):
                if 'node_modules' not in str(file):
                    analysis = self.analyze_javascript_file(file)
                    self.components['frontend']['files'].append(analysis)
                    
                    # Track technologies
                    for imp in analysis['imports']:
                        if 'react' in imp.lower():
                            self.technologies.add('React')
                        elif 'ethers' in imp.lower():
                            self.technologies.add('Ethers.js')
        
        # Blockchain analysis
        contracts_dir = self.root / 'blockchain' / 'contracts'
        if contracts_dir.exists():
            self.components['blockchain'] = {
                'files': []
            }
            
            for file in contracts_dir.glob('*.sol'):
                analysis = self.analyze_solidity_file(file)
                self.components['blockchain']['files'].append(analysis)
                self.technologies.add('Solidity')
        
        print(f"✓ Scanned {len(backend_files)} backend files")
        print(f"✓ Scanned {len(self.components.get('frontend', {}).get('files', []))} frontend files")
        print(f"✓ Scanned {len(self.components.get('blockchain', {}).get('files', []))} blockchain files")
        print(f"✓ Identified {len(self.technologies)} technologies")
    
    def generate_cypher_queries(self) -> List[str]:
        """Generate Cypher queries to create the knowledge graph"""
        queries = []
        
        # Clear existing data
        queries.append("MATCH (n) DETACH DELETE n")
        
        # Create Project node
        queries.append("""
        CREATE (p:Project {
            name: 'VoiceVault',
            description: 'Voice biometric authentication system using AI and blockchain',
            type: 'Full-stack Application',
            created: datetime()
        })
        """)
        
        # Create Technology nodes
        for tech in self.technologies:
            queries.append(f"""
            MERGE (t:Technology {{name: '{tech}'}})
            WITH t
            MATCH (p:Project {{name: 'VoiceVault'}})
            MERGE (p)-[:USES_TECHNOLOGY]->(t)
            """)
        
        # Create Component nodes
        for component_name, component_data in self.components.items():
            queries.append(f"""
            CREATE (c:Component {{
                name: '{component_name}',
                type: '{component_name}',
                file_count: {len(component_data['files'])}
            }})
            WITH c
            MATCH (p:Project {{name: 'VoiceVault'}})
            MERGE (p)-[:HAS_COMPONENT]->(c)
            """)
            
            # Create File nodes
            for file_data in component_data['files']:
                filepath = file_data['filepath'].replace("'", "\\'")
                
                if component_name == 'backend':
                    queries.append(f"""
                    CREATE (f:File:PythonFile {{
                        path: '{filepath}',
                        name: '{Path(filepath).name}',
                        lines: {file_data['lines']},
                        functions: {len(file_data['functions'])},
                        routes: {len(file_data['routes'])}
                    }})
                    WITH f
                    MATCH (c:Component {{name: '{component_name}'}})
                    MERGE (c)-[:CONTAINS]->(f)
                    """)
                    
                    # Create Function nodes
                    for func in file_data['functions']:
                        queries.append(f"""
                        MERGE (fn:Function {{name: '{func}', file: '{filepath}'}})
                        WITH fn
                        MATCH (f:File {{path: '{filepath}'}})
                        MERGE (f)-[:DEFINES]->(fn)
                        """)
                    
                    # Create Route/API nodes
                    for route in file_data['routes']:
                        route_escaped = route.replace("'", "\\'")
                        queries.append(f"""
                        MERGE (r:APIEndpoint {{path: '{route_escaped}', file: '{filepath}'}})
                        WITH r
                        MATCH (f:File {{path: '{filepath}'}})
                        MERGE (f)-[:EXPOSES]->(r)
                        """)
                
                elif component_name == 'frontend':
                    queries.append(f"""
                    CREATE (f:File:JavaScriptFile {{
                        path: '{filepath}',
                        name: '{Path(filepath).name}',
                        lines: {file_data['lines']},
                        components: {len(file_data['components'])}
                    }})
                    WITH f
                    MATCH (c:Component {{name: '{component_name}'}})
                    MERGE (c)-[:CONTAINS]->(f)
                    """)
                    
                    # Create React Component nodes
                    for comp in file_data['components']:
                        queries.append(f"""
                        MERGE (rc:ReactComponent {{name: '{comp}', file: '{filepath}'}})
                        WITH rc
                        MATCH (f:File {{path: '{filepath}'}})
                        MERGE (f)-[:DEFINES]->(rc)
                        """)
                    
                    # Create API Call relationships
                    for api_call in file_data['api_calls']:
                        api_escaped = api_call.replace("'", "\\'")
                        queries.append(f"""
                        MATCH (f:File {{path: '{filepath}'}})
                        MERGE (api:APIEndpoint {{path: '{api_escaped}'}})
                        MERGE (f)-[:CALLS]->(api)
                        """)
                
                elif component_name == 'blockchain':
                    queries.append(f"""
                    CREATE (f:File:SolidityFile {{
                        path: '{filepath}',
                        name: '{Path(filepath).name}',
                        lines: {file_data['lines']},
                        contracts: {len(file_data['contracts'])}
                    }})
                    WITH f
                    MATCH (c:Component {{name: '{component_name}'}})
                    MERGE (c)-[:CONTAINS]->(f)
                    """)
                    
                    # Create Contract nodes
                    for contract in file_data['contracts']:
                        queries.append(f"""
                        MERGE (sc:SmartContract {{name: '{contract}', file: '{filepath}'}})
                        WITH sc
                        MATCH (f:File {{path: '{filepath}'}})
                        MERGE (f)-[:DEFINES]->(sc)
                        """)
        
        # Create data flow relationships
        queries.append("""
        // Voice Registration Flow
        CREATE (flow1:DataFlow {
            name: 'Voice Registration',
            steps: 'Audio Recording → Feature Extraction → Fuzzy Hashing → Blockchain Storage'
        })
        WITH flow1
        MATCH (p:Project {name: 'VoiceVault'})
        MERGE (p)-[:HAS_FLOW]->(flow1)
        """)
        
        queries.append("""
        // Voice Verification Flow
        CREATE (flow2:DataFlow {
            name: 'Voice Verification',
            steps: 'Audio Recording → Feature Extraction → Cosine Similarity → Deepfake Detection → Score Calculation'
        })
        WITH flow2
        MATCH (p:Project {name: 'VoiceVault'})
        MERGE (p)-[:HAS_FLOW]->(flow2)
        """)
        
        return queries
    
    def save_to_file(self, queries: List[str], filename: str = 'knowledge_graph.cypher'):
        """Save Cypher queries to file"""
        output_path = self.root / filename
        with open(output_path, 'w') as f:
            for query in queries:
                f.write(query.strip() + ';\n\n')
        print(f"✓ Saved {len(queries)} queries to {output_path}")
        return output_path

def main():
    root = Path(__file__).parent
    auditor = VoiceVaultAuditor(root)
    
    print("=" * 60)
    print("VoiceVault Knowledge Graph Creator")
    print("=" * 60)
    print()
    
    # Scan project
    auditor.scan_project()
    
    print()
    print("Generating Cypher queries...")
    queries = auditor.generate_cypher_queries()
    
    print(f"✓ Generated {len(queries)} Cypher queries")
    
    # Save to file
    output_file = auditor.save_to_file(queries)
    
    print()
    print("=" * 60)
    print("Audit Complete!")
    print("=" * 60)
    print()
    print(f"Components analyzed: {len(auditor.components)}")
    print(f"Technologies identified: {len(auditor.technologies)}")
    print(f"Cypher queries generated: {len(queries)}")
    print()
    print(f"Next step: Load queries into Neo4j")
    print(f"File: {output_file}")

if __name__ == '__main__':
    main()
