"""Single source of truth for every tunable. Nothing model-related lives elsewhere."""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env", extra="ignore", protected_namespaces=()
    )

    database_url: str = "postgresql+psycopg://p2r:p2r_dev@127.0.0.1:5432/plan2reality"

    # --- NVIDIA: two models, two jobs (see PPT slide 4) ---
    nvidia_api_key: str = ""
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    ocr_model: str = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"       # input understanding only
    reasoning_model: str = "nvidia/nemotron-3-super-120b-a12b"             # all business reasoning
    extraction_temperature: float = 0.0   # extraction, not creativity: 0.0 for repeatability
    ocr_temperature: float = 0.0
    enable_thinking: bool = True
    max_tokens: int = 2048
    request_timeout: float = 90.0
    transport_retries: int = 4      # SDK-level, transient only. Measured ~7% 500s from
                                    # the endpoint, so 2 was not enough for a live demo.
    schema_repair_retries: int = 1  # "your JSON was invalid" round-trips

    # --- trust gate thresholds (Benchmark_Events decides MATCH/REVIEW/UNMATCHED) ---
    auto_post_min_confidence: float = 0.85
    review_min_confidence: float = 0.50
    auto_post_requires_identifier: bool = True

    # --- auth ---
    jwt_secret: str = "change-me-in-prod"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 720

    cors_origins: str = "http://localhost:3000"
    ontology_xlsx: str = str(BASE_DIR.parent / "data" / "ontology.xlsx")
    upload_dir: str = str(BASE_DIR / "uploads")

    @property
    def ontology_path(self) -> Path:
        """Relative paths in .env resolve against backend/, not the shell cwd."""
        p = Path(self.ontology_xlsx)
        return p if p.is_absolute() else (BASE_DIR / p).resolve()

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
