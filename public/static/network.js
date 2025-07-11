class NetWork {
  #Server = null;
  #Header = {};
  #noAuth() {
    return JSON.stringify(this.#Header) === "{}";
  }
  constructor(server = null) {
    this.#Server = server;
  }
  setServer(server) {
    this.#Server = server;
  }
  setHeader(header) {
    this.#Header = header;
  }
  detail() {
    return new PromiseEx((acc, rej) => {
      fetch(`${this.#Server}/detail`, {
        method: "GET",
        headers: this.#Header
      }).then(res => res.json()).then(res => {
        res.code === 200 ? acc(res.data) : rej(res.msg);
      });
    });
  }
  setEngine(engine) {
    return new PromiseEx((acc, rej) => {
      if (this.#noAuth()) {
        return rej("auth failed");
      }
      fetch(`${this.#Server}/engine?target=${engine}`, {
        method: "POST",
        headers: this.#Header
      }).then(res => res.json()).then(res => res.code === 200 ? acc(res.data) : rej(res.msg));
    });
  }
  relate(engine, query) {
    return new PromiseEx((acc, rej) => {
      fetch(
        `${this.#Server}/relate?engine=${engine}&query=${query}`
      ).then(res => res.json()).then(res => res.code === 200 ? acc(res.data) : rej(res.msg));
    });
  }
  rank(opt) {
    if (this.#noAuth()) {
      return;
    }
    fetch(`${this.#Server}/rank`, {
      method: "POST",
      headers: this.#Header,
      body: JSON.stringify(opt)
    });
  }
  collapse(opt) {
    if (this.#noAuth()) {
      return;
    }
    fetch(`${this.#Server}/group/collapse`, {
      method: "POST",
      headers: this.#Header,
      body: JSON.stringify(opt)
    });
  }
  groupAdd(name) {
    return new PromiseEx((_, rej) => {
      if (this.#noAuth()) {
        return rej("仅登录后才能新建分组");
      }
      fetch(
        `${this.#Server}/group/add`,
        {
          method: "POST",
          headers: this.#Header,
          body: name
        }
      ).then(res => res.json()).then(res => {
        if (res.code !== 200) rej(res.msg);
      }).catch(e => rej(e.message));
    });
  }
  groupRename(gid, name) {
    return new PromiseEx((_, rej) => {
      if (this.#noAuth()) {
        return rej("仅登录后才能命名分组");
      }
      fetch(
        `${this.#Server}/group/rename`,
        {
          method: "POST",
          headers: this.#Header,
          body: JSON.stringify({ gid, name })
        }
      ).then(res => res.json()).then(res => {
        if (res.code !== 200) rej(res.msg);
      }).catch(e => rej(e.message));
    });
  }
  groupDelete(gid) {
    return new PromiseEx((_, rej) => {
      if (this.#noAuth()) {
        return rej("仅登录后才能删除分组");
      }
      fetch(
        `${this.#Server}/group/delete`,
        {
          method: "POST",
          headers: this.#Header,
          body: `${gid}`
        }
      ).then(res => res.json()).then(res => {
        if (res.code !== 200) rej(res.msg);
      }).catch(e => rej(e.message));
    });
  }
  linkAdd(info, gid) {
    return new PromiseEx((_, rej) => {
      if (this.#noAuth()) {
        return rej("仅登录后才能添加快捷方式");
      }
      fetch(
        `${this.#Server}/link/add`,
        {
          method: "POST",
          headers: this.#Header,
          body: JSON.stringify({ gid, info })
        }
      ).then(res => res.json()).then(res => {
        if (res.code !== 200) rej(res.msg);
      }).catch(e => rej(e.message));
    });
  }
  linkEdit(info, gid, lid) {
    return new PromiseEx((_, rej) => {
      if (this.#noAuth()) {
        return rej("仅登录后才能修改快捷方式");
      }
      fetch(
        `${this.#Server}/link/edit`,
        {
          method: "POST",
          headers: this.#Header,
          body: JSON.stringify({ gid, lid, info })
        }
      ).then(res => res.json()).then(res => {
        if (res.code !== 200) rej(res.msg);
      }).catch(e => rej(e.message));
    });
  }
  linkDelete(gid, lid) {
    return new PromiseEx((_, rej) => {
      if (this.#noAuth()) {
        return rej("仅登录后才能删除快捷方式");
      }
      fetch(
        `${this.#Server}/link/delete`,
        {
          method: "POST",
          headers: this.#Header,
          body: JSON.stringify({ gid, lid })
        }
      ).then(res => res.json()).then(res => {
        if (res.code !== 200) rej(res.msg);
      }).catch(e => rej(e.message));
    });
  }
}
