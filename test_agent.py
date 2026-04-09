
import asyncio
import json
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.services.agent_service import ResearchAgent

async def test_chat():
    agent = ResearchAgent()
    print("Testing CHAT intent...")
    async for event in agent.run_agent_loop("Hi, how are you?"):
        print(f"Event: {event}")

async def test_research():
    agent = ResearchAgent()
    print("\nTesting RESEARCH intent...")
    async for event in agent.run_agent_loop("AI in oncology"):
        print(f"Event: {event[:100]}...")

if __name__ == "__main__":
    asyncio.run(test_chat())
    # asyncio.run(test_research())
