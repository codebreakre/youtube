// Video catalog requests, one file each.
import { getVideos } from './getVideos.js';
import { getVideo } from './getVideo.js';
import { getRelatedVideos } from './getRelatedVideos.js';
import { addView } from './addView.js';
import { uploadThumbnail } from './uploadThumbnail.js';

export const videosApi = {
  list: getVideos,
  get: getVideo,
  related: getRelatedVideos,
  addView,
  uploadThumbnail,
};
