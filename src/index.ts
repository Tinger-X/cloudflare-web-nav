class NavAPI {
  static #StrBase = "qwertyuioplkjhgfdsazxcvbnm0123456789MNBVCXZASDFGHJKLPOIUYTREWQ";
  static #InitDetail = [
    "bing",
    [
      [0, "基础工具"],
      ["在线PS", "https://ps.gaoding.com/", "https://www.uupoop.com/favicon.ico"],
      ["ProcessOn", "https://www.processon.com/diagrams", "https://www.processon.com/favicon.ico"],
      ["极简壁纸", "https://bz.zzzmh.cn/index", "https://bz.zzzmh.cn/favicon.ico"],
      ["IconFont", "https://www.iconfont.cn/", "https://img.alicdn.com/imgextra/i2/O1CN01ZyAlrn1MwaMhqz36G_!!6000000001499-73-tps-64-64.ico"],
      ["非凡资源", "https://cj.ffzyapi.com/", "https://cj.ffzyapi.com/template/default/img/favicon.png"],
      ["文本转语音", "https://www.text-to-speech.cn/", "https://www.text-to-speech.cn/img/speech.png"]
    ]
  ];
  static #MinTokenSize = 8;
  static #Prefix = {
    sys: "_SYS_",
    token: "_TOKEN_",
    blocked: "_BLOCKED_IP_"
  };
  #args: { [k: string]: string; };
  #req: Request;
  #env: Env;
  ip: string;
  #token: string | null;
  #blocked: Set<unknown>;
  path: string[];

  static #randStr(size = 16) {
    let res = "";
    for (let i = 0; i < size; ++i) res += NavAPI.#StrBase.charAt(Math.floor(Math.random() * NavAPI.#StrBase.length));
    return res;
  }

  constructor(request: Request, env: Env, url: URL) {
    this.#args = Object.fromEntries(url.searchParams);
    this.#req = request;
    this.#env = env;
    this.ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "1.1.1.1";
    this.#token = request.headers.get(env.TokenName);

    this.#blocked = new Set();
    this.path = url.pathname.split("/").filter(Boolean);
  }

  async isIpBlocked() {
    this.#blocked = new Set(await this.#getKV(NavAPI.#Prefix.blocked) || []);
    return this.#blocked.has(this.ip);
  }

  async needInit(): Promise<boolean> {
    const adminToken = await this.#getKV(`${NavAPI.#Prefix.sys}Admin`, { type: "text" });
    return adminToken === null;
  }

  #restResp(data: any) {
    const resp = Response.json(data);
    resp.headers.set("Access-Control-Allow-Origin", this.#env.AllowOrigin);
    resp.headers.set("Access-Control-Allow-Headers", this.#env.TokenName);
    return resp;
  }

  async #setKV(key: string, value: any, opt = {}) {
    if ("string" !== typeof value) {
      value = JSON.stringify(value);
    }
    await this.#env.KeyValue.put(key, value, opt);
  }

  async #getKV(key: string, opt: { [k: string]: any } = {}) {
    if (!opt.hasOwnProperty("type")) {
      opt.type = "json";
    }
    return await this.#env.KeyValue.get(key, opt);
  }

  async #queryLimit(key: string) {
    const ban = await this.#env.BanLimiter.limit({ key: key });
    if (!ban.success) {
      this.#blocked.add(this.ip);
      await this.#setKV(NavAPI.#Prefix.blocked, Array.from(this.#blocked));
      return `[${this.ip}] 不被允许`;
    }
    const warn = await this.#env.WarnLimiter.limit({ key: key });
    if (!warn.success) {
      return `[${this.ip}] 限制请求`;
    }
    return null;
  }

  async #authBeforeAction(strict: boolean, action: Function) {
    try {
      if (this.#token === null || this.#token.length < NavAPI.#MinTokenSize) {
        if (strict) {
          return this.#restResp({ code: 400, msg: "鉴权失败" });
        }
        const adminToken = await this.#getKV(`${NavAPI.#Prefix.sys}Admin`, { type: "text" });
        const detail = await this.#getKV(`${NavAPI.#Prefix.token}${adminToken}`);
        return action.call(this, detail);
      }
      const detail = await this.#getKV(`${NavAPI.#Prefix.token}${this.#token}`);
      return action.call(this, detail);
    } catch (e) {
      console.log(e);
      return this.#restResp({ code: 500, msg: "发生错误" });
    }
  }

  ////////////////////////////////////////////////// = Realte = //////////////////////////////////////////////////
  static #EnginMap: { [k: string]: Function } = {
    baidu: NavAPI.#relateBaidu,
    bing: NavAPI.#relateBing,
    google: NavAPI.#relateGoogle
  };
  static #UserAgent = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0"
  };

  static async #relateBaidu(query: string): Promise<string[]> {
    const url = `https://www.baidu.com/sugrec?prod=pc&wd=${query}`;
    const resp = await fetch(url, { method: "GET", headers: NavAPI.#UserAgent });
    if (!resp.ok) {
      throw new Error(resp.statusText);
    }
    const data = await resp.json() as { [k: string]: [{ [k: string]: any }] };
    return data.g.map(itr => itr.q);
  }

  static async #relateBing(query: string): Promise<string[]> {
    const url = `https://cn.bing.com/AS/Suggestions?csr=1&cvid=${NavAPI.#randStr(16)}&qry=${query}`;
    const resp = await fetch(url, { method: "GET", headers: NavAPI.#UserAgent });

    if (!resp.ok) {
      throw new Error(resp.statusText);
    }
    const data = await resp.json() as { [k: string]: [{ [k: string]: any }] };
    return data.s.map(itr => itr.q.replace(/|/g, ""));
  }

  static async #relateGoogle(query: string): Promise<string[]> {
    const url = `https://www.google.com/complete/search?client=gws-wiz&q=${query}`;
    const resp = await fetch(url, { method: "GET", headers: NavAPI.#UserAgent });

    if (!resp.ok) {
      throw new Error(resp.statusText);
    }
    const data = (await resp.text()).trim().slice(19, -1);
    const res = JSON.parse(data)[0] as string[][];
    return res.map(itr => itr[0].replace(/<\/?b>/g, ""));
  }

  async handleRelate() {
    if (this.#req.method !== "GET") {
      return this.#restResp({ code: 400, msg: "请求方法错误" });
    }
    const engine = this.#args.engine, query = this.#args.query?.trim();
    if (query === undefined || query === "" || !NavAPI.#EnginMap.hasOwnProperty(engine)) {
      return this.#restResp({ code: 400, msg: "参数错误" });
    }
    try {
      const payload = await NavAPI.#EnginMap[engine](query);
      return this.#restResp({ code: 200, data: payload });
    } catch (e) {
      console.log(e);
      return this.#restResp({ code: 500, msg: "查询失败" });
    }
  }

  ////////////////////////////////////////////////// = Detail = //////////////////////////////////////////////////
  async handleDetail() {
    if (this.#req.method !== "GET") {
      return this.#restResp({ code: 400, msg: "请求方法错误" });
    }
    return this.#authBeforeAction(false, (detail: any) => {
      return this.#restResp({ code: 200, data: detail });
    });
  }

  ////////////////////////////////////////////////// = Engine = //////////////////////////////////////////////////
  async handleEngine() {
    if (this.#req.method !== "POST") {
      return this.#restResp({ code: 400, msg: "请求方法错误" });
    }
    const engine = this.#args.target;
    if (!["baidu", "bing", "google"].includes(engine)) {
      this.#restResp({ code: 400, msg: "参数错误" });
    }
    return this.#authBeforeAction(true, async (detail: any) => {
      detail[0] = engine;
      await this.#setKV(`${NavAPI.#Prefix.token}${this.#token}`, detail);
      return this.#restResp({ code: 200, data: engine });
    });
  }

  ////////////////////////////////////////////////// = User = //////////////////////////////////////////////////
  async handleUser() {
    const limit = await this.#queryLimit(`user_${this.ip}`);
    if (limit !== null) {
      return this.#restResp({ code: 400, msg: limit });
    }

    if (this.#req.method !== "POST") {
      return this.#restResp({ code: 400, msg: "请求方法错误" });
    }
    if (this.#token === null || this.#token.length < NavAPI.#MinTokenSize) {
      return this.#restResp({ code: 400, msg: "参数错误" });
    }
    const tokenKey = `${NavAPI.#Prefix.token}${this.#token}`;
    const detail = await this.#getKV(tokenKey);
    if (detail === null) {
      await this.#setKV(tokenKey, ["bing"]);
      return this.#restResp({ code: 200, msg: "注册成功" });
    }
    return this.#restResp({ code: 200, msg: "登录成功" });
  }

  ////////////////////////////////////////////////// = Init = //////////////////////////////////////////////////
  async handleInit() {
    const limit = await this.#queryLimit(`init_${this.ip}`);
    if (limit !== null) {
      return this.#restResp({ code: 400, msg: limit });
    }

    if (this.#req.method !== "POST") {
      return this.#restResp({ code: 400, msg: "请求方法错误" });
    }

    if (this.#token === null || this.#token.length < NavAPI.#MinTokenSize) {
      return this.#restResp({ code: 400, msg: "参数错误" });
    }
    const adminKey = `${NavAPI.#Prefix.sys}Admin`;
    if (await this.#getKV(adminKey, { type: "text" }) !== null) {
      return this.#restResp({ code: 400, msg: "非法操作" });
    }
    await this.#setKV(adminKey, this.#token);
    await this.#setKV(`${NavAPI.#Prefix.token}${this.#token}`, NavAPI.#InitDetail);
    return this.#restResp({
      code: 200,
      data: { token: this.#token, detail: NavAPI.#InitDetail }
    });
  }

  ////////////////////////////////////////////////// = Link = //////////////////////////////////////////////////
  async #addLink(detail: any) {
    try {
      const { gid, info } = await this.#req.json() as { gid: number, info: any };
      if (gid < 0 || gid > detail.length - 2) {
        throw new Error("参数错误");
      }
      if (info.constructor !== Array || info.length !== 3) {
        throw new Error("参数错误");
      }
      detail[gid + 1].push(info);
      await this.#setKV(`${NavAPI.#Prefix.token}${this.#token}`, detail);
      return this.#restResp({ code: 200, data: null });
    } catch (e) {
      console.log(e);
      return this.#restResp({ code: 400, msg: "参数错误" });
    }
  }

  async #editLink(detail: any) {
    try {
      const { info, gid, lid } = await this.#req.json() as { gid: number, info: string[], lid: number };
      if (gid < 0 || gid > detail.length - 2) {
        throw new Error("参数错误");
      } else if (lid < 0 || lid > detail[gid + 1].length - 2) {
        throw new Error("参数错误");
      }
      if (info.constructor !== Array || info.length !== 3) {
        throw new Error("参数错误");
      }
      detail[gid + 1][lid + 1] = info;
      await this.#setKV(`${NavAPI.#Prefix.token}${this.#token}`, detail);
      return this.#restResp({ code: 200, data: null });
    } catch (e) {
      console.log(e);
      return this.#restResp({ code: 400, msg: "参数错误" });
    }
  }

  async #deleteLink(detail: any) {
    try {
      const { gid, lid } = await this.#req.json() as { gid: number, lid: number };
      if (gid < 0 || gid > detail.length - 2) {
        throw new Error("参数错误");
      } else if (lid < 0 || lid > detail[gid + 1].length - 2) {
        throw new Error("参数错误");
      }
      detail[gid + 1].splice(lid + 1, 1);
      await this.#setKV(`${NavAPI.#Prefix.token}${this.#token}`, detail);
      return this.#restResp({ code: 200, data: null });
    } catch (e) {
      console.log(e);
      return this.#restResp({ code: 400, msg: "参数错误" });
    }
  }

  async handleLink() {
    if (this.#req.method !== "POST") {
      return this.#restResp({ code: 400, msg: "请求方法错误" });
    }
    const linkMap: { [k: string]: Function } = {
      add: this.#addLink,
      edit: this.#editLink,
      delete: this.#deleteLink
    };
    if (!linkMap.hasOwnProperty(this.path[2])) {
      return this.#restResp({ code: 400, msg: "接口不存在" });
    }
    return this.#authBeforeAction(true, linkMap[this.path[2]].bind(this));
  }

  ////////////////////////////////////////////////// = Group = //////////////////////////////////////////////////
  async #addGroup(detail: any) {
    try {
      const name = await this.#req.text();
      detail.splice(1, 0, [[0, name]]);
      await this.#setKV(`${NavAPI.#Prefix.token}${this.#token}`, detail);
      return this.#restResp({ code: 200, data: null });
    } catch (e) {
      console.log(e);
      return this.#restResp({ code: 400, msg: "参数错误" });
    }
  }

  async #renameGroup(detail: any) {
    try {
      const { gid, name } = await this.#req.json() as { gid: number, name: string };
      if (gid < 0 || gid > detail.length - 2 || name === "") {
        throw new Error("参数错误");
      }
      detail[gid + 1][0][1] = name;
      await this.#setKV(`${NavAPI.#Prefix.token}${this.#token}`, detail);
      return this.#restResp({ code: 200, data: null });
    } catch (e) {
      console.log(e);
      return this.#restResp({ code: 400, msg: "参数错误" });
    }
  }

  async #deleteGroup(detail: any) {
    try {
      const gid = parseInt(await this.#req.text());
      if (gid < 0 || gid > detail.length - 2) {
        throw new Error("参数错误");
      }
      detail.splice(gid + 1, 1);
      await this.#setKV(`${NavAPI.#Prefix.token}${this.#token}`, detail);
      return this.#restResp({ code: 200, data: null });
    } catch (e) {
      console.log(e);
      return this.#restResp({ code: 400, msg: "参数错误" });
    }
  }

  async #collapseGroup(detail: any) {
    try {
      const opt = await this.#req.json() as { [k: string]: any };
      if (![0, 1].includes(opt.status)) {
        throw new Error("参数错误");
      }
      if (opt.type === "one") {
        if (opt.gid < 0 || opt.gid > detail.length - 2) {
          throw new Error("参数错误");
        }
        detail[opt.gid + 1][0][0] = opt.status;
      } else if (opt.type === "all") {
        for (let gid = 1; gid < detail.length; ++gid) {
          detail[gid][0][0] = opt.status;
        }
      }
      await this.#setKV(`${NavAPI.#Prefix.token}${this.#token}`, detail);
      return this.#restResp({ code: 200, data: null });
    } catch (e) {
      console.log(e);
      return this.#restResp({ code: 400, msg: "参数错误" });
    }
  }

  async handleGroup() {
    if (this.#req.method !== "POST") {
      return this.#restResp({ code: 400, msg: "请求方法错误" });
    }
    const groupMap: { [k: string]: Function } = {
      add: this.#addGroup,
      rename: this.#renameGroup,
      delete: this.#deleteGroup,
      collapse: this.#collapseGroup
    };
    if (!groupMap.hasOwnProperty(this.path[2])) {
      return this.#restResp({ code: 400, msg: "接口不存在" });
    }
    return this.#authBeforeAction(true, groupMap[this.path[2]].bind(this));
  }

  ////////////////////////////////////////////////// = Rank = //////////////////////////////////////////////////
  async handleRank() {
    return this.#authBeforeAction(true, async (detail: any) => {
      try {
        const opt = await this.#req.json() as { [k: string]: any };
        if (opt.type === "item") {
          const [fgid, fidx, tgid, tidx] = opt.data;
          if (fgid < 0 || fgid > detail.length - 2) {
            throw new Error("参数错误");
          } else if (tgid < 0 || tgid > detail.length - 2) {
            throw new Error("参数错误");
          }
          if (fidx < 0 || fidx > detail[fgid + 1].length - 2) {
            throw new Error("参数错误");
          } else if (tidx < 0 || tidx > detail[tgid + 1].length - 1) {
            throw new Error("参数错误");
          }
          const target = detail[fgid + 1].splice(fidx + 1, 1)[0];
          detail[tgid + 1].splice(tidx + 1, 0, target);
        } else if (opt.type === "group") {
          const [fgid, tgid] = opt.data;
          if (fgid < 0 || fgid > detail.length - 2) {
            throw new Error("参数错误");
          } else if (tgid < 0 || tgid > detail.length - 2) {
            throw new Error("参数错误");
          }
          const target = detail.splice(fgid + 1, 1)[0];
          detail.splice(tgid + 1, 0, target);
        }
        await this.#setKV(`${NavAPI.#Prefix.token}${this.#token}`, detail);
        return this.#restResp({ code: 200, data: null });
      } catch (e) {
        console.log(e);
        return this.#restResp({ code: 400, msg: "参数错误" });
      }
    });
  }
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const api = new NavAPI(request, env, url);
    if (await api.isIpBlocked()) {
      return Response.json({ code: 400, msg: `[${api.ip}] 不被允许` });
    }
    const rootMap: { [k: string]: Function } = {
      relate: api.handleRelate,
      detail: api.handleDetail,
      engine: api.handleEngine,
      user: api.handleUser,
      init: api.handleInit,
      link: api.handleLink,
      group: api.handleGroup,
      rank: api.handleRank
    };
    if (api.path.length === 0) {
      return env.Assets.fetch(`${url.origin}/index.html`);
    } else if (api.path[0] === "api") {
      if (!rootMap.hasOwnProperty(api.path[1])) {
        return Response.json({ code: 400, msg: "interface not found" });
      }
      return rootMap[api.path[1]].call(api);
    }
    return env.Assets.fetch(request);
  }
};
