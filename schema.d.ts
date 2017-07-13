import {xObject} from "../../types";

export interface RouteObject {
  id: string;
  name: string;
  uri: string;
  path?: string;
}

export interface GuideObject {
  id: string;
  name: string;
  uri: string;
  positioning?: xObject;
  route?: RouteObject;
  status: "idle"|"guiding";
}

export interface PositioningObject {
  id: string;
  name: string;
  uri: string;
  mapMatchedLocation?: xObject;
}
