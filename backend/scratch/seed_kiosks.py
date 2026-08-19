from app.core.database import SessionLocal
from app.models.kiosk_device import KioskDevice

def seed():
    db = SessionLocal()
    try:
        # Clear existing and insert the clean 2 devices
        db.query(KioskDevice).delete()
        db.commit()

        k1 = KioskDevice(
            id=1,
            name='Office Control PC',
            location='Admin Desk',
            status='online',
            last_seen='Active',
            camera_status='Connected',
            engine_status='Active',
            ip='127.0.0.1 (Localhost)'
        )
        k2 = KioskDevice(
            id=2,
            name='Mobile Scanner Device',
            location='Field Phone (LTE / Tunnel)',
            status='online',
            last_seen='Just now',
            camera_status='Connected',
            engine_status='Active',
            ip='trycloudflare.com (SSL Tunnel)'
        )
        db.add(k1)
        db.add(k2)
        db.commit()
        print("Successfully seeded Office Control PC and Mobile Scanner Device into database!")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
