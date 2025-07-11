class Manager {
  #Token = new LocalToken();
  #Relate = new LocalRelate();
  #Detail = new LocalDetail();
  #Network = new NetWork();
  #onLoginResult = null;

  constructor(server, tokenName) {
    this.#Network.setServer(server);
    this.#Token.setName(tokenName);
    if (this.#Token.valid()) {
      this.#Network.setHeader(this.#Token.makeHeader());
    }

    window.addEventListener("message", event => {
      try {
        const res = JSON.parse(event.data);
        if (res.code === 200) {
          this.#Token.set(res.data);
          this.#Network.setHeader(this.#Token.makeHeader());
        }
        this.#onLoginResult && this.#onLoginResult(res);
      } catch (e) {
        console.log(e);
      }
    });
  }
  loginStatus() {
    return this.#Token.valid();
  }
  oauthLogin(fn) {
    if (this.#Token.valid()) {
      return acc(this.#Token.get());
    }
    window.open(`https://wx-api.tinger.host/oauth?target=${window.location.href}`);
    this.#onLoginResult = fn;
  }
  logout() {
    this.#Token.del();
    this.#Network.setHeader({});
  }
  setEngine(engine) {
    return new PromiseEx((_, rej) => {
      if (!["baidu", "bing", "google"].includes(engine)) return rej("[Local] Param Error");
      if (this.#Token.valid()) {
        this.#Detail.setEngine(engine);
        this.#Network.setEngine(engine).catch(err => rej(err));
      }
    });
  }
  relate(engine, query) {
    return new PromiseEx((acc, rej) => {
      if (query === undefined || query === "") return rej("[Front] 查询参数错误");
      this.#Network.relate(engine, query).then(res => {
        acc({ type: "cloud", data: res });
      }).catch(err => rej(err));
      acc({ type: "local", data: this.#Relate.search(query) });
    });
  }
  localRelateUpdate(word) {
    this.#Relate.update(word);
  }
  localRelateDelete(word) {
    this.#Relate.delete(word);
  }
  detail() {
    return new PromiseEx((acc, rej) => {
      this.#Network.detail().then(res => {
        if (res === null) rej(-1);
        else this.#Detail.update(res) && acc(res);
      }).catch(err => rej(err));
      acc(this.#Detail.detail());
    });
  }
  rank(opt) {
    this.#Detail.rank(opt);
    this.#Network.rank(opt);
  }
  collapse(opt) {
    this.#Detail.collapse(opt);
    this.#Network.collapse(opt);
  }
  groupAdd(name) {
    this.#Detail.groupAdd(name);
    return this.#Network.groupAdd(name);
  }
  groupRename(gid, name) {
    this.#Detail.groupRename(gid, name);
    return this.#Network.groupRename(gid, name);
  }
  groupDelete(gid) {
    this.#Detail.groupDelete(gid);
    return this.#Network.groupDelete(gid);
  }
  linkAdd(info, gid) {
    this.#Detail.linkAdd(info, gid);
    return this.#Network.linkAdd(info, gid);
  }
  linkEdit(info, gid, lid) {
    this.#Detail.linkEdit(info, gid, lid);
    return this.#Network.linkEdit(info, gid, lid);
  }
  linkDelete(gid, lid) {
    this.#Detail.linkDelete(gid, lid);
    return this.#Network.linkDelete(gid, lid);
  }
}
