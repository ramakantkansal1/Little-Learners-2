"""Admin authoring, aggregation and authorization regression checks."""
import pytest

@pytest.mark.asyncio
async def test_admin_metrics_and_analytics_are_live(admin_client):
    metrics=await admin_client.get('/api/v1/admin/dashboard')
    assert metrics.status_code==200
    assert metrics.json()['active_accounts']==1
    assert metrics.json()['total_children']==0
    analytics=await admin_client.get('/api/v1/admin/analytics')
    assert analytics.status_code==200
    assert isinstance(analytics.json()['registrations_by_day'],list)

@pytest.mark.asyncio
async def test_catalog_relationships_and_settings_persist(admin_client):
    headers={'X-CSRF-Token':admin_client.csrf_token}
    domain=await admin_client.post('/api/v1/admin/catalog/domains',json={'stage_id':1,'code':'test_domain','name':'Discovery'},headers=headers)
    assert domain.status_code==201
    changed=await admin_client.put(f"/api/v1/admin/catalog/domains/{domain.json()['id']}",json={'stage_id':1,'code':'test_domain','name':'Discovery updated'},headers=headers)
    assert changed.status_code==200
    assert changed.json()['name']=='Discovery updated'
    bad=await admin_client.post('/api/v1/admin/catalog/topics',json={'subject_id':99999,'code':'bad','name':'Bad link'},headers=headers)
    assert bad.status_code==422
    settings=await admin_client.put('/api/v1/admin/platform-settings',json={'application_name':'Learning test','english_enabled':True,'hindi_enabled':False},headers=headers)
    assert settings.status_code==200
    assert (await admin_client.get('/api/v1/admin/platform-settings')).json()['application_name']=='Learning test'
    invalid=await admin_client.put('/api/v1/admin/platform-settings',json={'english_enabled':False,'hindi_enabled':False},headers=headers)
    assert invalid.status_code==422
    logs=(await admin_client.get('/api/v1/admin/audit-logs')).json()['logs']
    assert any(log['resource_type']=='domains' and log['action']=='create' for log in logs)

@pytest.mark.asyncio
async def test_admin_cannot_suspend_or_demote_self(admin_client):
    me=(await admin_client.get('/api/v1/auth/me')).json()
    response=await admin_client.patch(f"/api/v1/admin/users/{me['id']}",json={'is_active':False},headers={'X-CSRF-Token':admin_client.csrf_token})
    assert response.status_code==422
    assert (await admin_client.get('/api/v1/auth/me')).status_code==200

@pytest.mark.asyncio
async def test_anonymous_cannot_access_new_admin_modules(client):
    for path in ['catalog/domains','children','platform-settings','lessons/1/preview']:
        assert (await client.get('/api/v1/admin/'+path)).status_code==403
