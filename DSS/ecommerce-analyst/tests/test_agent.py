import json
from types import SimpleNamespace

from commerce_analyst.agent import CommerceAnalystAgent, TOOL_DEFINITIONS
from commerce_analyst.config import Settings


class FakeCompletions:
    def __init__(self):
        self.inputs = []
        self.count = 0

    def create(self, **kwargs):
        self.inputs.append(kwargs)
        self.count += 1
        if self.count == 1:
            tool_call = SimpleNamespace(
                id="call_1",
                function=SimpleNamespace(
                    name="site_summary",
                    arguments=json.dumps({"start_date": "20260826", "end_date": "20260826"}),
                ),
            )
            message = SimpleNamespace(content=None, tool_calls=[tool_call])
            return SimpleNamespace(choices=[SimpleNamespace(message=message)])
        message = SimpleNamespace(content="Revenue was $100.", tool_calls=None)
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])


class FakeTools:
    def site_summary(self, **kwargs): return [{"revenue": 100}]
    def funnel(self, **kwargs): return []
    def product_performance(self, **kwargs): return []
    def top_selling_products(self, **kwargs): return []
    def search_products(self, **kwargs): return []
    def product_affinities(self, **kwargs): return {}
    def search_performance(self, **kwargs): return []
    def segmentation(self, **kwargs): return []
    def inventory_friction(self, **kwargs): return []
    def get_product(self, **kwargs): return {}
    def find_related_products(self, **kwargs): return []
    def search_catalog(self, **kwargs): return []


def test_agent_dispatches_tool_and_returns_final_text() -> None:
    completions = FakeCompletions()
    client = SimpleNamespace(chat=SimpleNamespace(completions=completions))
    catalog = SimpleNamespace(
        get_product=FakeTools().get_product,
        find_related_products=FakeTools().find_related_products,
        search_catalog=FakeTools().search_catalog,
    )
    agent = CommerceAnalystAgent(Settings(), FakeTools(), client=client, catalog=catalog)
    assert agent.ask("How did we do?") == "Revenue was $100."
    tool_message = completions.inputs[0]["messages"][0]
    assert tool_message["role"] == "system"
    follow_up_tools = [msg for msg in completions.inputs[1]["messages"] if msg.get("role") == "tool"]
    assert json.loads(follow_up_tools[0]["content"])["data"] == [{"revenue": 100}]
    assert all(tool["type"] == "function" for tool in TOOL_DEFINITIONS)
    assert all("function" in tool for tool in TOOL_DEFINITIONS)
