import asyncio
import os
from dotenv import load_dotenv
load_dotenv()

from agents import Agent, Runner
from linkedin_log import read_log, get_post_count

STRATEGY_FILE = os.path.join(os.path.dirname(__file__), "linkedin_strategy.md")
ORG_ID = "106436663"


def build_performance_summary() -> str:
    """Build a text summary of the performance log for the strategist agent."""
    entries = read_log()
    if not entries:
        return "No posts logged yet. No data to analyze."

    lines = [f"Total posts logged: {len(entries)}\n"]
    for i, entry in enumerate(entries):
        snapshot = entry.get("stats_snapshot", {})
        lines.append(
            f"Post {i+1}: [{entry.get('topic', 'unknown')}] "
            f"style={entry.get('style', 'unknown')} | "
            f"summary: {entry.get('content_summary', 'N/A')[:80]} | "
            f"delta_impressions={entry.get('delta_impressions', 'N/A')} | "
            f"delta_clicks={entry.get('delta_clicks', 'N/A')} | "
            f"delta_likes={entry.get('delta_likes', 'N/A')} | "
            f"followers_at_time={snapshot.get('followers', 'N/A')}"
        )
    return "\n".join(lines)


agent = Agent(
    name="LinkedIn Strategist",
    instructions=(
        "You are a data-driven social media strategist for Agentic AI @ UIUC. "
        "You analyze LinkedIn performance data and write a strategy document. "
        "Be specific and actionable — not vague. Use the actual numbers. "
        "Output ONLY the markdown content for the strategy file, nothing else. "
        "Follow this exact structure:\n\n"
        "# LinkedIn Strategy — Auto-Generated\n\n"
        "> This file is read by the LinkedIn persona agent before every post.\n"
        "> Last updated: [today's date]\n\n"
        "## Current Frequency\n[recommendation based on engagement trends]\n\n"
        "## What's Working\n[bullet points with data]\n\n"
        "## What's Not Working\n[bullet points with data]\n\n"
        "## Next Experiments\n[3-4 specific ideas to test]\n\n"
        "## Stats Summary\n[key metrics]\n"
    ),
)


async def update_strategy():
    summary = build_performance_summary()
    result = await Runner.run(
        starting_agent=agent,
        input=(
            f"Analyze this LinkedIn performance data for organization {ORG_ID} "
            f"and write an updated strategy document:\n\n{summary}"
        ),
    )
    with open(STRATEGY_FILE, "w") as f:
        f.write(result.final_output)
    print(f"Strategy updated: {STRATEGY_FILE}")


if __name__ == "__main__":
    asyncio.run(update_strategy())
