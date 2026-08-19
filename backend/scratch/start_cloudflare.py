import os
import sys
import urllib.request
import subprocess
import re
import time
from pathlib import Path

# Paths
scratch_dir = Path(__file__).parent
cloudflared_path = scratch_dir / "cloudflared.exe"
url_file = scratch_dir / "cloudflare_url.txt"

# 1. Download cloudflared if not present
if not cloudflared_path.exists():
    print("Downloading cloudflared.exe from Cloudflare GitHub releases...")
    url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    try:
        urllib.request.urlretrieve(url, str(cloudflared_path))
        print("Download successful!")
    except Exception as e:
        print(f"Error downloading cloudflared: {e}")
        sys.exit(1)

# 2. Launch cloudflared quick tunnel
print("Starting Cloudflare Quick Tunnel...")
cmd = [str(cloudflared_path), "tunnel", "--url", "http://127.0.0.1:8000"]

proc = subprocess.Popen(
    cmd,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1
)

url_found = None
start_time = time.time()

# 3. Read output to extract the trycloudflare.com URL
while True:
    # Timeout after 30 seconds
    if time.time() - start_time > 30:
        print("Timeout waiting for Cloudflare URL.")
        break
        
    line = proc.stdout.readline()
    if not line:
        break
        
    stripped_line = line.strip()
    if stripped_line:
        print(stripped_line)
        
    # Cloudflare outputs quick tunnel URLs like https://*.trycloudflare.com
    match = re.search(r"https://[a-zA-Z0-9.-]+\.trycloudflare\.com", line)
    if match:
        url_found = match.group(0)
        print(f"\nSUCCESS! Found Cloudflare URL: {url_found}\n", flush=True)
        
        # Save to file
        with open(url_file, "w") as f:
            f.write(url_found)
            
        # Keep process alive and printing outputs
        try:
            while True:
                line = proc.stdout.readline()
                if not line:
                    break
                print(line.strip(), flush=True)
        except KeyboardInterrupt:
            pass
        break

if not url_found:
    print("Could not find Cloudflare tunnel URL in output.")
    sys.exit(1)
