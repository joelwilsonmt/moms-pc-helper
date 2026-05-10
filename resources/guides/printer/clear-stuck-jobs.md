---
id: printer/clear-stuck-jobs
title: Clear stuck print jobs
category: printer
minutes: 5
---

# Clear stuck print jobs

Sometimes a print job gets stuck and nothing will print — even new jobs pile up behind it. This clears the queue so your printer can start fresh.

## Steps

1. Press the **Windows key** and type **Services**. Click the result that says "Services."

2. Scroll down the list until you find **Print Spooler**. Click it once to select it.

3. On the left side, click **Stop the service**. Wait a few seconds.

4. Now open **File Explorer** and navigate to this folder by typing it in the address bar at the top:
   ```
   C:\Windows\System32\spool\PRINTERS
   ```

5. Select everything in that folder (press **Ctrl + A**) and delete it. These are the stuck print jobs — deleting them is safe.

6. Go back to **Services**, click **Print Spooler** again, and click **Start the service**.

7. Try printing again.

## If it still doesn't print

- Make sure the printer is turned on and the cables are plugged in (or it's connected to Wi-Fi).
- Try turning the printer off, waiting 30 seconds, and turning it back on.
- If nothing helps, use the **Get Help** button on the home screen to send me a message.
