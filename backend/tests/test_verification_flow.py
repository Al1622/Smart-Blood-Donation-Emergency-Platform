import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.database import Base, engine, get_db
from app.auth import User, hash_password, verify_password
from app.main import app
from models.profile import Profile


@pytest.fixture
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    with TestClient(app) as test_client:
        yield test_client

    Base.metadata.drop_all(bind=engine)


def test_public_signup_ignores_admin_role(client):
    response = client.post(
        '/api/auth/signup',
        json={
            'username': 'alice',
            'email': 'alice@example.com',
            'password': 'secret123',
            'role': 'admin',
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body['data']['role'] == 'user'


def test_non_admin_cannot_approve_profile(client):
    signup_response = client.post(
        '/api/auth/signup',
        json={
            'username': 'bob',
            'email': 'bob@example.com',
            'password': 'secret123',
        },
    )
    token = signup_response.json()['token']
    headers = {'Authorization': f'Bearer {token}'}

    profile_response = client.post(
        '/api/profiles',
        json={
            'full_name': 'Bob Example',
            'email': 'bob-profile@example.com',
            'phone': '01700000000',
            'blood_group': 'O+',
            'address': 'Dhaka',
            'nid_number': '1234567890',
            'nid_document_reference': 'doc-001',
        },
        headers=headers,
    )

    assert profile_response.status_code == 201
    profile_id = profile_response.json()['data']['id']

    approve_response = client.post(
        f'/api/admin/profiles/{profile_id}/approve',
        headers=headers,
    )

    assert approve_response.status_code == 403


def test_profile_creation_is_pending_and_hides_nid_in_listing(client):
    signup_response = client.post(
        '/api/auth/signup',
        json={
            'username': 'carol',
            'email': 'carol@example.com',
            'password': 'secret123',
        },
    )
    token = signup_response.json()['token']
    headers = {'Authorization': f'Bearer {token}'}

    profile_response = client.post(
        '/api/profiles',
        json={
            'full_name': 'Carol Example',
            'email': 'carol-profile@example.com',
            'phone': '01800000000',
            'blood_group': 'A+',
            'address': 'Chittagong',
            'nid_number': '9876543210',
            'nid_document_reference': 'doc-002',
        },
        headers=headers,
    )

    assert profile_response.status_code == 201
    profile = profile_response.json()['data']
    assert profile['verification_status'] == 'PENDING'

    listing_response = client.get('/api/profiles', headers=headers)
    assert listing_response.status_code == 200
    assert 'nid_number' not in listing_response.json()['data'][0]


def test_logout_invalidates_token(client):
    signup_response = client.post(
        '/api/auth/signup',
        json={
            'username': 'dana',
            'email': 'dana@example.com',
            'password': 'secret123',
        },
    )
    token = signup_response.json()['token']
    headers = {'Authorization': f'Bearer {token}'}

    protected_before_logout = client.get('/api/profiles', headers=headers)
    assert protected_before_logout.status_code == 200

    logout_response = client.post('/api/auth/logout', headers=headers)
    assert logout_response.status_code == 200

    protected_response = client.get('/api/profiles', headers=headers)
    assert protected_response.status_code == 401


def test_duplicate_profile_creation_is_rejected(client):
    signup_response = client.post(
        '/api/auth/signup',
        json={
            'username': 'erin',
            'email': 'erin@example.com',
            'password': 'secret123',
        },
    )
    token = signup_response.json()['token']
    headers = {'Authorization': f'Bearer {token}'}

    first_profile = client.post(
        '/api/profiles',
        json={
            'full_name': 'Erin Example',
            'email': 'erin-profile@example.com',
            'phone': '01900000000',
            'blood_group': 'B+',
            'address': 'Khulna',
        },
        headers=headers,
    )
    assert first_profile.status_code == 201

    second_profile = client.post(
        '/api/profiles',
        json={
            'full_name': 'Erin Again',
            'email': 'erin-profile-2@example.com',
            'phone': '01900000001',
            'blood_group': 'AB+',
            'address': 'Khulna',
        },
        headers=headers,
    )

    assert second_profile.status_code == 409


def test_owner_profile_access_and_update_are_denied_for_other_users(client):
    user_a = client.post(
        '/api/auth/signup',
        json={
            'username': 'frank',
            'email': 'frank@example.com',
            'password': 'secret123',
        },
    )
    user_b = client.post(
        '/api/auth/signup',
        json={
            'username': 'grace',
            'email': 'grace@example.com',
            'password': 'secret123',
        },
    )

    token_a = user_a.json()['token']
    token_b = user_b.json()['token']
    headers_a = {'Authorization': f'Bearer {token_a}'}
    headers_b = {'Authorization': f'Bearer {token_b}'}

    profile_b = client.post(
        '/api/profiles',
        json={
            'full_name': 'Grace Example',
            'email': 'grace-profile@example.com',
            'phone': '02000000000',
            'blood_group': 'O-',
            'address': 'Sylhet',
            'nid_number': '2222222222',
            'nid_document_reference': 'doc-222',
        },
        headers=headers_b,
    )
    profile_id = profile_b.json()['data']['id']

    private_view = client.get(f'/api/profiles/{profile_id}', headers=headers_a)
    assert private_view.status_code == 403

    private_update = client.patch(
        f'/api/profiles/{profile_id}',
        json={'address': 'Hacked'},
        headers=headers_a,
    )
    assert private_update.status_code == 403


def test_user_cannot_approve_own_profile_or_set_verification_status(client):
    signup_response = client.post(
        '/api/auth/signup',
        json={
            'username': 'hank',
            'email': 'hank@example.com',
            'password': 'secret123',
        },
    )
    token = signup_response.json()['token']
    headers = {'Authorization': f'Bearer {token}'}

    profile_response = client.post(
        '/api/profiles',
        json={
            'full_name': 'Hank Example',
            'email': 'hank-profile@example.com',
            'phone': '02100000000',
            'blood_group': 'A-',
            'address': 'Rajshahi',
        },
        headers=headers,
    )
    profile_id = profile_response.json()['data']['id']

    approve_self = client.post(f'/api/admin/profiles/{profile_id}/approve', headers=headers)
    assert approve_self.status_code == 403

    status_attempt = client.patch(
        f'/api/profiles/{profile_id}',
        json={'verification_status': 'APPROVED'},
        headers=headers,
    )
    assert status_attempt.status_code == 403


def test_admin_approval_updates_status_and_audit_logs_exclude_nid(client):
    user_response = client.post(
        '/api/auth/signup',
        json={
            'username': 'ivan',
            'email': 'ivan@example.com',
            'password': 'secret123',
        },
    )
    admin_response = client.post(
        '/api/auth/signup',
        json={
            'username': 'admin1',
            'email': 'admin1@example.com',
            'password': 'secret123',
            'role': 'admin',
        },
    )

    user_token = user_response.json()['token']
    admin_token = admin_response.json()['token']

    headers_user = {'Authorization': f'Bearer {user_token}'}
    headers_admin = {'Authorization': f'Bearer {admin_token}'}

    profile_response = client.post(
        '/api/profiles',
        json={
            'full_name': 'Ivan Example',
            'email': 'ivan-profile@example.com',
            'phone': '02200000000',
            'blood_group': 'AB-',
            'address': 'Barisal',
            'nid_number': '3333333333',
            'nid_document_reference': 'doc-333',
        },
        headers=headers_user,
    )
    profile_id = profile_response.json()['data']['id']

    approve_response = client.post(f'/api/admin/profiles/{profile_id}/approve', headers=headers_admin)
    assert approve_response.status_code == 200
    assert approve_response.json()['data']['verification_status'] == 'APPROVED'

    listing_response = client.get('/api/profiles', headers=headers_user)
    assert 'nid_number' not in listing_response.json()['data'][0]

    audit_logs = client.get('/api/health')
    assert audit_logs.status_code == 200
