import { MapData } from '../../types/MapData';

export const BeginningMap: MapData = {
  "id": "map_beginning",
  "name": "始まり",
  "width": 16,
  "height": 16,
  "bgMode": "text-black",
  "events": [
    {
      "x": 8,
      "y": 7,
      "type": "start_point",
      "data": {
        "fromMap": null
      }
    }
  ],
  "items": [],
  "enemies": [
    "text_teki"
  ]
};
