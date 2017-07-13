import { BehaviorSubject, Subject } from '@reactivex/rxjs';
import * as uuid from "uuid";
import { rsiLogger } from "../../log";

import { Service, Resource, Element, ResourceUpdate, StatusCode, ElementResponse, CollectionResponse } from "../rsiPlugin";
import { GuideObject, PositioningObject } from "./schema";

import * as polyline from '@mapbox/polyline';

class RouteGuidance extends Service {
  constructor() {
    super();
    this.id = "a9a1073f-e91f-5d56-8468-f5d6bd1d8c96"; //random id
    this.resources.push(new Positionings(this));
    this.resources.push(new Guides(this));
  }
}

interface GuideElement extends Element {
  data: GuideObject;
}

class Guides implements Resource {
  static defaultGuideId = "d6ebae92-d2c1-11e6-9376-df943f51f0d8";

  private _name: string;
  private _guides: BehaviorSubject<GuideElement>[] = [];
  private _change: BehaviorSubject<ResourceUpdate>;
  private _logger = rsiLogger.getInstance().getLogger("routeguidance");

  constructor(private service: Service) {
    let newId = uuid.v1();
    let defaultGuide = new BehaviorSubject<GuideElement>({
      lastUpdate: Date.now(),
      propertiesChanged: [],
      data: {
        uri: "/" + this.service.name.toLowerCase() + "/" + this.name.toLowerCase() + "/" + Guides.defaultGuideId,
        id: Guides.defaultGuideId,
        name: "default",
        status: "idle",
        positioning: {
          id: newId,
          name: "-",
          uri: "/" + this.service.name.toLowerCase() + "/positionings/" + newId,
        }
      }
    });
    this._guides.push(defaultGuide);
    this._change = new BehaviorSubject(<ResourceUpdate>{ lastUpdate: Date.now(), action: 'init' });
  }

  get name(): string {
    return this.constructor.name;
  };

  get elementSubscribable(): Boolean {
    return true;
  };

  get change(): BehaviorSubject<ResourceUpdate> {
    return this._change;
  }

  getElement(elementId: string): ElementResponse {
    // find the element requested by the client
    return {
      status: "ok",
      data: this._guides.find((element: BehaviorSubject<GuideElement>) => {
        return (<{ id: string }>element.getValue().data).id === elementId;
      })
    };
  };

  getResource(offset?: string | number, limit?: string | number): CollectionResponse {
    // retriev all element
    let resp: BehaviorSubject<GuideElement>[];

    if ((typeof offset === "number" && typeof limit === "number") || (typeof limit === "number" && !offset) || (typeof offset === "number" && !limit) || (!offset && !limit)) {
      resp = this._guides.slice(<number>offset, <number>limit);
    }

    return { status: "ok", data: resp };
  };

  private _interval: NodeJS.Timer;
  private _currentRoute: number[][] = [];
  private _nextIndex: number = -1;

  updateElement(elementId: string, difference: any): ElementResponse {
    let element = (<BehaviorSubject<GuideElement>>this.getElement(elementId).data);
    var guide: GuideObject = element.getValue().data;
    let propertiesChanged: string[] = [];

    if (difference.hasOwnProperty("route")) {
      guide.route = difference.route;
      propertiesChanged.push("route");

      clearInterval(this._interval);
      this._currentRoute = polyline.decode(guide.route.path);

      if(this._currentRoute.length > 0) {
        this._nextIndex = 0;
      } else {
        this._nextIndex = -1;
      }
    }

    if (difference.hasOwnProperty("status")) {
      if (-1 !== ["idle", "guiding"].indexOf(difference.status)) {
        guide.status = difference.status;
        propertiesChanged.push("status");

        if(guide.status == "guiding" && this._nextIndex >= 0) {
          const speed = 1000;

          this._interval = setInterval(() => {
            guide.positioning.name =
              this._currentRoute[this._nextIndex][0] + ", " +
              this._currentRoute[this._nextIndex][1];

            element.next(
              {
                lastUpdate: Date.now(),
                propertiesChanged: ["positioning"],
                data: guide
              });

            if((this._nextIndex + 1) < (this._currentRoute.length - 1)) {
              this._nextIndex++;
            } else {
              this._nextIndex = -1;
            }
          }, speed);
        }
      }
    }

    let resp = {
      lastUpdate: Date.now(),
      propertiesChanged: propertiesChanged,
      data: guide
    };

    element.next(resp); // @TODO: check diffs bevor updating without a need

    return { status: "ok" };
  };
}

interface PositioningElement extends Element {
  data: PositioningObject;
}

class Positionings implements Resource {
  static defaultPositioningId = "d6ebae92-d2c1-11e6-9376-df933f51f1d8";

  private _name: string;
  private _positionings: BehaviorSubject<PositioningElement>[] = [];
  private _change: BehaviorSubject<ResourceUpdate>;
  private _logger = rsiLogger.getInstance().getLogger("routeguidance");

  constructor(private service: Service) {
    let defaultMap = new BehaviorSubject<PositioningElement>({
      lastUpdate: Date.now(),
      propertiesChanged: [],
      data: {
        uri: "/" + this.service.name.toLowerCase() + "/" + this.name.toLowerCase() + "/" + Positionings.defaultPositioningId,
        id: Positionings.defaultPositioningId,
        name: "default"
      }
    });
    this._positionings.push(defaultMap);

    this._change = new BehaviorSubject(<ResourceUpdate>{ lastUpdate: Date.now(), action: 'init' });
  }

  get name(): string {
    return this.constructor.name;
  };

  get elementSubscribable(): Boolean {
    return true;
  };

  get change(): BehaviorSubject<ResourceUpdate> {
    return this._change;
  }

  getElement(elementId: string): ElementResponse {
    // find the element requested by the client
    return {
      status: "ok",
      data: this._positionings.find((element: BehaviorSubject<PositioningElement>) => {
        return (<{ id: string }>element.getValue().data).id === elementId;
      })
    };
  };

  getResource(offset?: string | number, limit?: string | number): CollectionResponse {
    // retriev all element
    let resp: BehaviorSubject<PositioningElement>[];

    if ((typeof offset === "number" && typeof limit === "number") || (typeof limit === "number" && !offset) || (typeof offset === "number" && !limit) || (!offset && !limit)) {
      resp = this._positionings.slice(<number>offset, <number>limit);
    }

    return { status: "ok", data: resp };
  };

  updateElement(elementId: string, difference: any): ElementResponse {
    let element = (<BehaviorSubject<PositioningElement>>this.getElement(elementId).data);
    var positioning: PositioningObject = element.getValue().data;
    let propertiesChanged: string[] = [];

    if (difference.hasOwnProperty("mapMatchedLocation")) {
      positioning.mapMatchedLocation = difference.mapMatchedLocation;
      propertiesChanged.push("mapMatchedLocation");
    }

    let resp = {
      lastUpdate: Date.now(),
      propertiesChanged: propertiesChanged,
      data: positioning
    };
    element.next(resp); // @TODO: check diffs bevor updating without a need
    return { status: "ok" };
  };
}

export {RouteGuidance as Service};
