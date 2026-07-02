import { MapData } from '../../types/MapData';

export const Map1782951234203: MapData = {
  "id": "map_1782951234203",
  "name": "HD-2Dの世界",
  "width": 16,
  "height": 16,
  "bgMode": "image",
  "events": [
    {
      "x": 15,
      "y": 15,
      "type": "start_point",
      "data": {
        "fromMap": null
      }
    },
    {
      "x": 8,
      "y": 8,
      "type": "teleport",
      "data": {
        "targetMap": "map_1782999318445",
        "requiredSearchRate": 100
      }
    }
  ],
  "items": [],
  "enemies": [
    "color_slime_red",
    "color_slime_blue",
    "color_goblin"
  ],
  "bgImage": "grass_bg_1782776475818.jpg"
};


