import subprocess
import time
import re
import sys
from pathlib import Path

# Command to run
cmd = ["ssh", "-p", "443", "-o", "StrictHostKeyChecking=no", "-R0:localhost:8000", "free.pinggy.io"]

print("Starting SSH Pinggy tunnel...")
# Start process, redirect stderr to stdout so we can read everything
proc = subprocess.Popen(
    cmd,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1
)

url_found = None
start_time = time.time()

# Read output line by line looking for the pinggy HTTPS link
while True:
    # Timeout after 20 seconds
    if time.time() - start_time > 20:
        print("Timeout waiting for Pinggy URL.")
        break
        
    line = proc.stdout.readline()
    if not line:
        break
        
    print(line.strip())
    
    # Search for HTTPS url in the line
    match = re.search(r"https://[a-zA-Z0-9.-]+\.pinggy\.link", line)
    if match:
        url_found = match.group(0)
        print(f"\nSUCCESS! Found Pinggy URL: {url_found}\n")
        
        # Save to file
        scratch_dir = Path(__file__).parent
        with open(scratch_dir / "pinggy_url.txt", "w") as f:
            f.write(url_found)
        break

if not url_found:
    print("Could not find Pinggy URL in stdout/stderr.")
    sys.exit(1)
