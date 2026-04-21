1. the back receive the meta data image
   1.1 the back must valid that the message is an image
   1.2 the back must request the image to facebook
2. the back must valid the image using idwhatsapp
   2.1 the back must get information about the user from DB
   2.2 the back must valid the image using AI
   2.3 the back must to save the image on a google bucket
   2.4 the back must update the user album data (stamps, redeem, promos)
       - **updateAlbumData** function handles the loyalty stamp system:
         1. Validates user profile exists in Firestore
         2. Gets existing album and stamp count
         3. Picks random stamp number (1-110) not yet used
         4. Creates album entry with stamp, URL, timestamp
         5. Manages redeem/promo logic (every 3 valid images = 1 promo)
         6. Atomically updates Firestore

         **Return structure:**
         ```json
         {
           "stat": "ok" | "error",
           "data": {
             "message": "...",
             "newStamp": 1-110,
             "url": "GCS image URL",
             "albumCount": total stamps,
             "redeem": 0-2 (resets at 3),
             "promosCount": total promos triggered,
             "promoTriggered": true | false
           }
         }
         ``` 