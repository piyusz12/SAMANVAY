def test_login_success(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@samanvay.aicte.gov.in", "password": "Demo@AICTE2026!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["role"] == "SUPER_ADMIN"

def test_login_invalid_password(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@samanvay.aicte.gov.in", "password": "WrongPassword!"}
    )
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]

def test_get_current_user_profile(client, admin_token):
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "admin@samanvay.aicte.gov.in"
    assert data["role"] == "SUPER_ADMIN"
