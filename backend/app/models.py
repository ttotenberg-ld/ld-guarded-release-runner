from pydantic import BaseModel, validator, field_validator
from typing import List, Optional, Union, Dict, Any
import json

class MetricStats(BaseModel):
    count: int = 0
    sum: float = 0
    avg: float = 0

class VariationStats(BaseModel):
    error_rate: MetricStats = MetricStats()
    latency: MetricStats = MetricStats()
    business: MetricStats = MetricStats()

class SimulationStats(BaseModel):
    control: VariationStats = VariationStats()
    treatment: VariationStats = VariationStats()
    last_updated: float = 0  # timestamp of last update

class LDConfig(BaseModel):
    sdk_key: str
    api_key: str
    project_key: str
    flag_key: str
    latency_metric_1: str
    error_metric_1: str
    business_metric_1: str
    latency_metric_1_false_range: List[int]
    latency_metric_1_true_range: List[int]
    error_metric_1_false_converted: int
    error_metric_1_true_converted: int
    business_metric_1_false_converted: int
    business_metric_1_true_converted: int
    error_metric_enabled: bool = True
    latency_metric_enabled: bool = True
    business_metric_enabled: bool = True
    
    @field_validator('latency_metric_1_false_range', 'latency_metric_1_true_range')
    def validate_range(cls, v):
        if len(v) != 2 or v[0] > v[1]:
            raise ValueError('Range must be a list of two integers with first value <= second value')
        return v
        
    @field_validator('error_metric_1_false_converted', 'error_metric_1_true_converted', 'business_metric_1_false_converted', 'business_metric_1_true_converted')
    def validate_percentage(cls, v):
        if v < 0 or v > 100:
            raise ValueError('Conversion rate must be between 0 and 100')
        return v
        
    @field_validator('error_metric_enabled', 'latency_metric_enabled', 'business_metric_enabled')
    def validate_toggle(cls, v):
        # Ensure toggle values are strictly boolean
        if v is True or v == 'true' or v == 1:
            return True
        return False

class SimulationStatus(BaseModel):
    running: bool
    events_sent: int = 0
    last_error: Optional[str] = None
    stats: SimulationStats = SimulationStats()
    guarded_rollout_active: bool = False
    first_event_time: Optional[float] = None  # Timestamp when first event was sent
    end_time: Optional[float] = None  # Timestamp when simulation stopped
