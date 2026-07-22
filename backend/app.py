from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS

from extensions import db
from routes.profile_routes import profile_bp


BASE_DIR = Path(__file__).resolve().parent


def create_app():
    app = Flask(__name__)

    database_path = BASE_DIR / "smart_blood.db"

    app.config["SQLALCHEMY_DATABASE_URI"] = (
        f"sqlite:///{database_path.as_posix()}"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ]
        }
    },
)

    app.register_blueprint(profile_bp)

    @app.get("/api/health")
    def health_check():
        return jsonify(
            {
                "success": True,
                "message": "Backend server is running.",
            }
        ), 200

    with app.app_context():
        db.create_all()

    return app


app = create_app()


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True,
    )