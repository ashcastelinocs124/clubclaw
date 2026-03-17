import asyncio
import os
import time
from dotenv import load_dotenv
load_dotenv()

from composio import Composio
from agents import Agent, Runner
from composio_openai_agents import OpenAIAgentsProvider
from linkedin_log import log_post, get_last_snapshot, get_post_count

ORG_ID = "106436663"
ORG_URN = f"urn:li:organization:{ORG_ID}"
STRATEGY_FILE = os.path.join(os.path.dirname(__file__), "linkedin_strategy.md")
GUIDELINES_FILE = os.path.join(os.path.dirname(__file__), "linkedin.md")

composio = Composio(api_key=os.environ["COMPOSIO_API_KEY"], provider=OpenAIAgentsProvider())

session = composio.create(user_id=os.environ["COMPOSIO_USER_ID"])
tools = session.tools()


def read_file(path: str) -> str:
    """Read a file and return its contents, or empty string if missing."""
    if not os.path.exists(path):
        return ""
    with open(path, "r") as f:
        return f.read()


# --- Step 1: Stats Agent — pulls current aggregate stats ---
stats_agent = Agent(
    name="Stats Puller",
    instructions=(
        "You retrieve LinkedIn organization statistics. "
        "Call the tools exactly as instructed and return the raw numbers as JSON. "
        "Output ONLY valid JSON with keys: followers, impressions, unique_impressions, clicks, likes, comments, shares. "
        "No markdown, no explanation — just the JSON object."
    ),
    tools=tools,
)


# --- Step 2: Poster Agent — writes and posts ---
def make_poster_agent(strategy: str, guidelines: str, performance_context: str) -> Agent:
    return Agent(
        name="LinkedIn Persona",
        instructions=(
            "You are the social media manager for Agentic AI @ UIUC, the largest student-run AI club at UIUC. "
            "Your job is to write and post ONE engaging LinkedIn post.\n\n"
            "STRATEGY (what's working, what to try next):\n"
            f"{strategy}\n\n"
            "CONTENT GUIDELINES (tone, pillars, guardrails):\n"
            f"{guidelines}\n\n"
            "RECENT PERFORMANCE CONTEXT:\n"
            f"{performance_context}\n\n"
            "RULES:\n"
            "- Write a single post following the strategy and guidelines\n"
            "- Vary the topic, style, and angle from recent posts\n"
            "- Content pillars: events, recaps, member spotlights, technical content, milestones, project updates\n"
            "- Styles to rotate: hot take, explainer, question, announcement, insight\n"
            "- Keep it 3-5 short paragraphs with line breaks\n"
            "- End with 2-3 hashtags (always include #AgenticAI #UIUC)\n"
            "- Post it immediately on behalf of organization ID 106436663\n"
            "- After posting, respond with ONLY a JSON object: "
            '{"post_urn": "<urn>", "topic": "<category>", "style": "<style>", "content_summary": "<first 100 chars>"}'
        ),
        tools=tools,
    )


async def main():
    # 1. Pull current stats
    print("Pulling current stats...")
    stats_result = await Runner.run(
        starting_agent=stats_agent,
        input=(
            f'1. LINKEDIN_GET_NETWORK_SIZE: use organization_id="{ORG_ID}"\n'
            f'2. LINKEDIN_GET_SHARE_STATS: use organizational_entity="{ORG_URN}" '
            "with NO time_intervals parameter\n\n"
            "Return JSON: {followers, impressions, unique_impressions, clicks, likes, comments, shares}"
        ),
    )

    # Parse stats
    import json
    try:
        current_stats = json.loads(stats_result.final_output)
    except json.JSONDecodeError:
        print(f"Warning: Could not parse stats JSON, using empty snapshot")
        print(f"Raw output: {stats_result.final_output}")
        current_stats = {}

    # 2. Compute deltas from last snapshot
    last_snapshot = get_last_snapshot()
    performance_context = ""
    if last_snapshot:
        deltas = {}
        for key in ["impressions", "clicks", "likes", "comments", "shares"]:
            old = last_snapshot.get(key, 0) or 0
            new = current_stats.get(key, 0) or 0
            deltas[key] = new - old
        performance_context = (
            f"Since last post — estimated deltas: "
            f"impressions: +{deltas['impressions']}, "
            f"clicks: +{deltas['clicks']}, "
            f"likes: +{deltas['likes']}, "
            f"comments: +{deltas['comments']}, "
            f"shares: +{deltas['shares']}"
        )
    else:
        performance_context = "First post — no prior data to compare against."

    print(f"Stats: {current_stats}")
    print(f"Performance context: {performance_context}")

    # 3. Read strategy and guidelines
    strategy = read_file(STRATEGY_FILE)
    guidelines = read_file(GUIDELINES_FILE)

    # 4. Generate and post
    print("Generating and posting...")
    poster = make_poster_agent(strategy, guidelines, performance_context)
    post_result = await Runner.run(
        starting_agent=poster,
        input="Write and post a fresh LinkedIn post now. Follow your strategy and guidelines.",
    )

    # 5. Log the result
    try:
        post_data = json.loads(post_result.final_output)
    except json.JSONDecodeError:
        print(f"Warning: Could not parse post result JSON")
        print(f"Raw output: {post_result.final_output}")
        post_data = {"content_summary": post_result.final_output[:100]}

    log_entry = {
        **post_data,
        "stats_snapshot": current_stats,
    }
    if last_snapshot:
        for key in ["impressions", "clicks", "likes", "comments", "shares"]:
            old = last_snapshot.get(key, 0) or 0
            new = current_stats.get(key, 0) or 0
            log_entry[f"delta_{key}"] = new - old

    log_post(log_entry)
    total = get_post_count()
    print(f"Post logged. Total posts: {total}")

    # 6. Update strategy every 10 posts
    if total % 10 == 0 and total > 0:
        print("10-post milestone — updating strategy...")
        from linkedin_update_strategy import update_strategy
        await update_strategy()

    print("Done!")


asyncio.run(main())
