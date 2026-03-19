#!/usr/bin/env python3
"""
Create a Google Drive workspace folder, a docs subfolder, and native copies of
the RAG and products Google Sheets templates.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


DEFAULT_CREDENTIALS_DIR = Path.home() / ".google_workspace_mcp" / "credentials"


def load_credentials(user_email: str, credentials_dir: Path) -> Credentials:
    creds_path = credentials_dir / f"{user_email}.json"
    if not creds_path.exists():
        raise FileNotFoundError(
            f"Credential file not found: {creds_path}. Authenticate Google Workspace first."
        )

    data = json.loads(creds_path.read_text())
    creds = Credentials(
        token=data.get("token"),
        refresh_token=data.get("refresh_token"),
        token_uri=data.get("token_uri"),
        client_id=data.get("client_id"),
        client_secret=data.get("client_secret"),
        scopes=data.get("scopes"),
    )

    if not creds.valid:
        creds.refresh(Request())
        data["token"] = creds.token
        data["expiry"] = creds.expiry.isoformat() if creds.expiry else None
        creds_path.write_text(json.dumps(data, indent=2))

    return creds


def create_folder(service, name: str, parent_folder_id: str | None = None) -> dict:
    body = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
    }
    if parent_folder_id and parent_folder_id != "root":
        body["parents"] = [parent_folder_id]

    return (
        service.files()
        .create(
            body=body,
            supportsAllDrives=True,
            fields="id,name,webViewLink,parents",
        )
        .execute()
    )


def copy_file(service, source_file_id: str, new_name: str, parent_folder_id: str) -> dict:
    return (
        service.files()
        .copy(
            fileId=source_file_id,
            body={"name": new_name, "parents": [parent_folder_id]},
            supportsAllDrives=True,
            fields="id,name,mimeType,webViewLink,parents",
        )
        .execute()
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create a Google Workspace case workspace with native template copies."
    )
    parser.add_argument("--user-email", required=True, help="Google account email.")
    parser.add_argument(
        "--workspace-name",
        required=True,
        help="Name of the top-level Drive workspace folder to create.",
    )
    parser.add_argument(
        "--rag-template-id",
        required=True,
        help="Google Sheets template ID for RAG / memory.",
    )
    parser.add_argument(
        "--products-template-id",
        required=True,
        help="Google Sheets template ID for products.",
    )
    parser.add_argument(
        "--parent-folder-id",
        default="root",
        help="Parent Drive folder ID. Defaults to root.",
    )
    parser.add_argument(
        "--credentials-dir",
        default=str(DEFAULT_CREDENTIALS_DIR),
        help="Directory containing Google OAuth credential JSON files.",
    )
    args = parser.parse_args()

    creds = load_credentials(args.user_email, Path(args.credentials_dir).expanduser())
    service = build("drive", "v3", credentials=creds)

    workspace_folder = create_folder(
        service,
        name=args.workspace_name,
        parent_folder_id=args.parent_folder_id,
    )
    docs_folder = create_folder(
        service,
        name="docs",
        parent_folder_id=workspace_folder["id"],
    )
    rag_copy = copy_file(
        service,
        source_file_id=args.rag_template_id,
        new_name=f"{args.workspace_name}__rag_memory",
        parent_folder_id=workspace_folder["id"],
    )
    products_copy = copy_file(
        service,
        source_file_id=args.products_template_id,
        new_name=f"{args.workspace_name}__products",
        parent_folder_id=workspace_folder["id"],
    )

    payload = {
        "workspace_folder_url": workspace_folder.get("webViewLink"),
        "workspace_folder_id": workspace_folder.get("id"),
        "docs_folder_url": docs_folder.get("webViewLink"),
        "docs_folder_id": docs_folder.get("id"),
        "rag_table_url": rag_copy.get("webViewLink"),
        "rag_table_id": rag_copy.get("id"),
        "products_table_url": products_copy.get("webViewLink"),
        "products_table_id": products_copy.get("id"),
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
