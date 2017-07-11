import {xObject} from "../../types";

export interface GuideObject {
  id: string;
  name: string;
  uri: string;
  positioning?: xObject;
  route?: xObject;
  status: "idle"|"guiding";
}

export interface PositioningObject {
  id: string;
  name: string;
  uri: string;
  mapMatchedLocation?: xObject;
}
