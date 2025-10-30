import json
import names
import random
import uuid
from ldclient import Context
from typing import Dict, Any, List, Optional

def create_user_context():
    """Construct a user context"""
    user_key = "usr-" + str(uuid.uuid4())
    name = f'{names.get_first_name()} {names.get_last_name()}'
    plan = random.choice(['platinum', 'silver', 'gold', 'diamond', 'free'])
    role = random.choice(['reader', 'writer', 'admin'])
    metro = random.choice(['New York', 'Chicago', 'Minneapolis', 'Atlanta', 'Los Angeles', 'San Francisco', 'Denver', 'Boston'])

    def beta_chance():
        return random.randint(1, 10) <= 3

    user_context = Context.builder(user_key) \
        .set("kind", "user") \
        .set("name", name) \
        .set("plan", plan) \
        .set("role", role) \
        .set("metro", metro) \
        .set("beta", beta_chance()) \
        .build()

    return user_context

def create_device_context():
    """Construct a device context"""
    device_key = "dvc-" + str(uuid.uuid4())
    os = random.choice(['Android', 'iOS', 'Mac OS', 'Windows'])
    version = random.choice(['1.0.2', '1.0.4', '1.0.7', '1.1.0', '1.1.5'])
    type = random.choice(['Fire TV', 'Roku', 'Hisense', 'Comcast', 'Verizon', 'Browser'])

    device_context = Context.builder(device_key) \
        .set("kind", "device") \
        .set("os", os) \
        .set("type", type) \
        .set("version", version) \
        .build()

    return device_context

def create_organization_context():
    """Construct an organization context"""
    key_name = random.choice([
        {"key": "org-7f9f58eb-c8e8-4c40-9962-43b13eeec4ea", "name": "Mayo Clinic", "employees": 76000}, 
        {"key": "org-40fad050-3f91-49dc-8007-33d02f1869e0", "name": "IBM", "employees": 288000}, 
        {"key": "org-fca878d0-3cab-4301-91da-bbc6dbb08fff", "name": "3M", "employees": 92000},
    ])
    region = random.choice(['NA', 'CN', 'EU', 'IN', 'SA'])

    org_context = Context.builder(key_name["key"]) \
        .set("kind", "organization") \
        .set("name", key_name["name"]) \
        .set("region", region) \
        .set("employees", key_name["employees"]) \
        .build()

    return org_context

def create_multi_context():
    """Construct a multi context: User, Device, and Organization"""
    multi_context = Context.create_multi(
        create_user_context(),
        create_device_context(),
        create_organization_context()
    )

    return multi_context

def error_chance(chance_number):
    """Error true or false calculator. Returns True if the random number is less than or equal to the chance_number."""
    # For testing, make higher percentages more likely to trigger 
    if chance_number > 20:
        # Bias towards triggering for higher percentages
        chance_calc = random.randint(1, 90)
    else:
        chance_calc = random.randint(1, 100)
    
    result = chance_calc <= chance_number
    return result
