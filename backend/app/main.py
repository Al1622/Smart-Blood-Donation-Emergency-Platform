from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.database import create_tables
from app.routers import router
from app.routers.admin import router as admin_router
from app.routers.auth import router as auth_router

app = FastAPI(title="Smart Blood Donation Emergency Platform")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = {}

    for error in exc.errors():
        location = ".".join(str(part) for part in error.get("loc", []) if part != "body")
        field = location or "request"
        errors[field] = error.get("msg", "Invalid value")

    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "Validation failed.",
            "errors": errors,
        },
    )


app.include_router(router)
app.include_router(auth_router)
app.include_router(admin_router)


@app.get("/api/health")
def health_check():
    return {
        "success": True,
        "message": "Backend server is running.",
    }


create_tables()
