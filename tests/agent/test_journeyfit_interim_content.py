from __future__ import annotations

from types import SimpleNamespace

from agent.conversation_loop import _should_suppress_tool_call_interim_content


def _tool_call(name: str):
    return SimpleNamespace(function=SimpleNamespace(name=name))


def test_suppresses_journeyfit_tool_call_interim_content():
    message = SimpleNamespace(
        content="Conclui o intake e montei a resposta.",
        tool_calls=[_tool_call("journeyfit_orchestrate")],
    )

    assert _should_suppress_tool_call_interim_content(message) is True


def test_does_not_suppress_other_tool_call_interim_content():
    message = SimpleNamespace(
        content="Vou procurar os arquivos agora.",
        tool_calls=[_tool_call("search_files")],
    )

    assert _should_suppress_tool_call_interim_content(message) is False

