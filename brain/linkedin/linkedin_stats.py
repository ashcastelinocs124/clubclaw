import asyncio
import os
import time
from dotenv import load_dotenv
load_dotenv()

from composio import Composio
from agents import Agent, Runner
from composio_openai_agents import OpenAIAgentsProvider

ORG_ID = "106436663"
ORG_URN = f"urn:li:organization:{ORG_ID}"

# Time range: last 30 days in epoch milliseconds
now_ms = int(time.time() * 1000)
thirty_days_ago_ms = now_ms - (30 * 24 * 60 * 60 * 1000)

composio = Composio(api_key=os.environ["COMPOSIO_API_KEY"], provider=OpenAIAgentsProvider())

external_user_id = os.environ["COMPOSIO_USER_ID"]

session = composio.create(
    user_id=external_user_id,
)

tools = session.tools()

agent = Agent(
    name="LinkedIn Stats Reporter",
    instructions=(
        "You are an analytics reporter for Agentic AI @ UIUC's LinkedIn organization page. "
        "Your job is to retrieve and present LinkedIn organization statistics in a clear, readable format. "
        "Always present numbers with context (e.g. follower growth over time, not just raw numbers). "
        "Format the output as a clean report with sections and bullet points."
    ),
    tools=tools,
)

async def main():
    result = await Runner.run(
        starting_agent=agent,
        input=(
            f"Pull per-post statistics for LinkedIn organization ID {ORG_ID}. "
            "Do the following in order:\n\n"
            f"1. LINKEDIN_GET_SHARE_STATS: use organizational_entity=\"{ORG_URN}\" "
            "with NO time_intervals parameter (get lifetime stats). "
            "This should return stats broken down by individual shares/posts. "
            "For each post, show its URN and stats (impressions, clicks, likes, comments, shares).\n\n"
            "2. For the top posts that have the most impressions, also call "
            "LINKEDIN_GET_POST_CONTENT with the post URN to get the post text.\n\n"
            "Present everything as a table with columns: "
            "Post (first 50 chars of text or URN), Impressions, Unique Impressions, Clicks, Likes, Comments, Shares.\n"
            "Sort by impressions descending (best performing first)."
        ),
    )
    print(result.final_output)

asyncio.run(main())
