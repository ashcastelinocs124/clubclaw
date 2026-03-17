import asyncio
import os
from dotenv import load_dotenv
load_dotenv()

from composio import Composio
from agents import Agent, Runner
from composio_openai_agents import OpenAIAgentsProvider

composio = Composio(api_key=os.environ["COMPOSIO_API_KEY"], provider=OpenAIAgentsProvider())

external_user_id = os.environ["COMPOSIO_USER_ID"]

session = composio.create(
    user_id=external_user_id,
)

tools = session.tools()

agent = Agent(
    name="LinkedIn Poster",
    instructions=(
        "You are the social media manager for Agentic AI @ UIUC, the largest student-run AI club at UIUC. "
        "Your job is to write and post engaging LinkedIn content about agentic AI, AI agents, LLMs, and the future of AI. "
        "Each post should be unique, insightful, and conversational — not generic or corporate. "
        "Mix up the style: sometimes share a hot take, sometimes a quick explainer, sometimes a question to spark discussion. "
        "Keep posts concise (3-5 sentences max). Always end with 2-3 relevant hashtags. "
        "Never repeat the same post twice. Be authentic and sound like a student org that's actually building with AI."
    ),
    tools=tools,
)

async def main():
    result = await Runner.run(
        starting_agent=agent,
        input=(
            "Generate a fresh, unique LinkedIn post about agentic AI or AI agents and post it "
            "on behalf of organization ID 106436663. "
            "Pick a specific angle — could be about autonomous coding agents, multi-agent systems, "
            "tool-using LLMs, agent reliability, agent orchestration, real-world agent deployments, "
            "or any cutting-edge topic in the agentic AI space. Make it interesting and not generic. "
            "Post it immediately without asking for confirmation."
        ),
    )
    print(result.final_output)

asyncio.run(main())
