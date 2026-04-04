#!/usr/bin/env python3
"""
Load VoiceVault Knowledge Graph into Neo4j
Uses Neo4j Python driver to execute Cypher queries
"""

import os
import sys
from pathlib import Path
from neo4j import GraphDatabase
import time

class Neo4jLoader:
    def __init__(self, uri, username, password):
        self.driver = GraphDatabase.driver(uri, auth=(username, password))
        
    def close(self):
        self.driver.close()
    
    def execute_query(self, query):
        """Execute a single Cypher query"""
        with self.driver.session() as session:
            result = session.run(query)
            return result.consume()
    
    def load_from_file(self, filepath):
        """Load and execute queries from file"""
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Split by semicolons and filter empty queries
        queries = [q.strip() for q in content.split(';') if q.strip()]
        
        print(f"Loading {len(queries)} queries into Neo4j...")
        print()
        
        successful = 0
        failed = 0
        
        for i, query in enumerate(queries, 1):
            try:
                # Skip comment-only queries
                if query.startswith('//') or not query:
                    continue
                    
                self.execute_query(query)
                successful += 1
                
                if i % 10 == 0:
                    print(f"Progress: {i}/{len(queries)} queries executed...")
                    
            except Exception as e:
                failed += 1
                print(f"Error in query {i}: {str(e)[:100]}")
        
        print()
        print(f"✓ Successfully executed: {successful}")
        if failed > 0:
            print(f"✗ Failed: {failed}")
        
        return successful, failed
    
    def verify_graph(self):
        """Verify the created graph"""
        print()
        print("=" * 60)
        print("Verifying Knowledge Graph...")
        print("=" * 60)
        print()
        
        queries = {
            "Total Nodes": "MATCH (n) RETURN count(n) as count",
            "Total Relationships": "MATCH ()-[r]->() RETURN count(r) as count",
            "Projects": "MATCH (p:Project) RETURN count(p) as count",
            "Components": "MATCH (c:Component) RETURN count(c) as count",
            "Files": "MATCH (f:File) RETURN count(f) as count",
            "Functions": "MATCH (fn:Function) RETURN count(fn) as count",
            "API Endpoints": "MATCH (api:APIEndpoint) RETURN count(api) as count",
            "React Components": "MATCH (rc:ReactComponent) RETURN count(rc) as count",
            "Smart Contracts": "MATCH (sc:SmartContract) RETURN count(sc) as count",
            "Technologies": "MATCH (t:Technology) RETURN count(t) as count",
        }
        
        with self.driver.session() as session:
            for label, query in queries.items():
                result = session.run(query)
                record = result.single()
                count = record['count'] if record else 0
                print(f"  {label}: {count}")
        
        print()
        
        # Get component breakdown
        print("Component Breakdown:")
        with self.driver.session() as session:
            query = """
            MATCH (c:Component)-[:CONTAINS]->(f:File)
            RETURN c.name as component, count(f) as file_count
            ORDER BY file_count DESC
            """
            results = session.run(query)
            for record in results:
                print(f"  {record['component']}: {record['file_count']} files")
        
        print()
        
        # Get technologies
        print("Technologies Used:")
        with self.driver.session() as session:
            query = "MATCH (t:Technology) RETURN t.name as name ORDER BY name"
            results = session.run(query)
            for record in results:
                print(f"  - {record['name']}")
        
        print()

def main():
    # Load environment variables - username is the instance ID for Aura
    uri = os.getenv('NEO4J_URI', 'neo4j+s://1f1a9222.databases.neo4j.io')
    username = os.getenv('NEO4J_USERNAME', '1f1a9222')  # Aura instance ID as username
    password = os.getenv('NEO4J_PASSWORD', 'wz2ZU2FC7dh-bN-McIdEWyrilNEhfhIo9IfqnayY59Q')
    
    print("=" * 60)
    print("VoiceVault Knowledge Graph Loader")
    print("=" * 60)
    print()
    print(f"Connecting to: {uri}")
    print(f"Username: {username}")
    print()
    
    # Create loader
    try:
        loader = Neo4jLoader(uri, username, password)
        print("✓ Connected to Neo4j")
        print()
    except Exception as e:
        print(f"✗ Failed to connect: {e}")
        sys.exit(1)
    
    # Load queries
    cypher_file = Path(__file__).parent / 'knowledge_graph.cypher'
    
    if not cypher_file.exists():
        print(f"✗ Cypher file not found: {cypher_file}")
        loader.close()
        sys.exit(1)
    
    print(f"Loading from: {cypher_file}")
    print()
    
    start_time = time.time()
    
    try:
        successful, failed = loader.load_from_file(cypher_file)
        
        elapsed = time.time() - start_time
        print()
        print(f"Completed in {elapsed:.2f} seconds")
        
        # Verify
        loader.verify_graph()
        
        print("=" * 60)
        print("Knowledge Graph Successfully Created!")
        print("=" * 60)
        print()
        print("You can now query the graph using:")
        print("  - Neo4j Browser")
        print("  - Neo4j Bloom")
        print("  - MCP-compatible AI assistants")
        print()
        
    except Exception as e:
        print(f"✗ Error loading graph: {e}")
        sys.exit(1)
    finally:
        loader.close()

if __name__ == '__main__':
    main()
