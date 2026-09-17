from typing import Optional

from pydantic import BaseModel


class TopBrand(BaseModel):
    brand: str
    count: int
    avg_price: float


class LocationCount(BaseModel):
    location: str
    count: int


class YearCount(BaseModel):
    year: int
    count: int


class MachineCount(BaseModel):
    machine_type: str
    count: int


class PriceBucket(BaseModel):
    min: float
    max: float
    count: int


class DatasetStatsResponse(BaseModel):
    seeded: bool
    filters: dict = {}
    total: int
    price_min: Optional[int] = None
    price_avg: Optional[float] = None
    price_max: Optional[int] = None
    year_min: Optional[int] = None
    year_avg: Optional[float] = None
    year_max: Optional[int] = None
    km_avg: Optional[float] = None
    brands: int = 0
    locations: int = 0
    top_brands: list[TopBrand] = []
    by_location: list[LocationCount] = []
    by_year: list[YearCount] = []
    by_machine: list[MachineCount] = []
    price_histogram: list[PriceBucket] = []
