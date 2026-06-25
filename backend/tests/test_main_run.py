"""Tests that run() honours $PORT and binds to 0.0.0.0."""

import os
import app.main as main_module


def test_run_binds_all_interfaces_and_honours_port(monkeypatch):
    captured = {}

    def fake_uvicorn_run(app_path: str, **kwargs: object) -> None:
        captured["app_path"] = app_path
        captured.update(kwargs)

    monkeypatch.setenv("PORT", "12345")
    monkeypatch.setattr(main_module, "_uvicorn_run", fake_uvicorn_run)
    main_module.run()
    assert captured["host"] == "0.0.0.0", f"host was {captured.get('host')}"
    assert captured["port"] == 12345, f"port was {captured.get('port')}"
    assert captured["app_path"] == "app.main:app"


def test_run_defaults_to_port_8000(monkeypatch):
    captured = {}
    monkeypatch.delenv("PORT", raising=False)
    monkeypatch.setattr(
        main_module, "_uvicorn_run",
        lambda app_path, **k: captured.update({"port": k["port"]})
    )
    main_module.run()
    assert captured["port"] == 8000
