class LocalToken {
  #Key = "_Local_Token_";
  #Token = null;
  #Name = null;
  #MinSize = 8;
  constructor(name) {
    this.#Name = name || "Token";
    this.#Token = localStorage.getItem(this.#Key);
  }
  setName(name) {
    this.#Name = name;
  }
  valid() {
    return this.#Token && this.#Token.length >= this.#MinSize;
  }
  get() {
    return this.#Token;
  }
  set(token) {
    this.#Token = token;
    localStorage.setItem(this.#Key, token);
  }
  del() {
    this.#Token = null;
    localStorage.removeItem(this.#Key);
  }
  makeHeader() {
    const header = {};
    if (this.valid()) {
      header[this.#Name] = this.#Token;
    }
    return header;
  }
}

class LocalRelate {
  #Key = "_Local_Relate_";
  #Data = [];
  constructor() {
    this.#Data = JSON.parse(localStorage.getItem(this.#Key) || "[]");
  }
  search(query) {
    const ptn = new RegExp(query.split().join(".*"), "i");
    const res = [];
    for (let i = 0; i < this.#Data.length && res.length < 10; ++i) {
      if (ptn.test(this.#Data[i])) {
        res.push(this.#Data[i]);
      }
    }
    return res;
  }
  update(word) {
    if (word === undefined) {
      return;
    }
    const index = this.#Data.indexOf(word);
    if (index !== -1) {
      this.#Data.splice(index, 1);
    }
    this.#Data.unshift(word);
    localStorage.setItem(this.#Key, JSON.stringify(this.#Data));
  }
  delete(word) {
    if (word === undefined) {
      return;
    }
    const index = this.#Data.indexOf(word);
    if (index !== -1) {
      this.#Data.splice(index, 1);
    }
    localStorage.setItem(this.#Key, JSON.stringify(this.#Data));
  }
}

class LocalDetail {
  #Key = "_Local_Detail_";
  #Data = ["bing"];
  #write() {
    localStorage.setItem(this.#Key, JSON.stringify(this.#Data));
  }
  constructor() {
    this.#Data = JSON.parse(localStorage.getItem(this.#Key) || `["bing"]`);
  }
  detail() {
    return this.#Data;
  }
  update(data) {
    const strNew = JSON.stringify(data), strNow = JSON.stringify(this.#Data);
    if (strNow !== strNew) {
      this.#Data = data;
      this.#write();
      return true;
    }
    return false;
  }
  setEngine(engine) {
    this.#Data[0] = engine;
    this.#write();
  }
  rank(opt) {
    if (opt.type === "item") {
      const [fgid, fidx, tgid, tidx] = opt.data;
      if (fgid < 0 || fgid > this.#Data.length - 2) {
        return;
      } else if (tgid < 0 || tgid > this.#Data.length - 2) {
        return;
      }
      if (fidx < 0 || fidx > this.#Data[fgid + 1].length - 2) {
        return;
      } else if (tidx < 0 || tidx > this.#Data[tgid + 1].length - 1) {
        return;
      }
      const target = this.#Data[fgid + 1].splice(fidx + 1, 1)[0];
      this.#Data[tgid + 1].splice(tidx + 1, 0, target);
    } else if (opt.type === "group") {
      const [fgid, tgid] = opt.data;
      if (fgid < 0 || fgid > this.#Data.length - 2) {
        return;
      } else if (tgid < 0 || tgid > this.#Data.length - 2) {
        return;
      }
      const target = this.#Data.splice(fgid + 1, 1)[0];
      this.#Data.splice(tgid + 1, 0, target);
    }
    this.#write();
  }
  collapse(opt) {
    if (![0, 1].includes(opt.status)) {
      return;
    }
    if (opt.type === "one") {
      if (opt.gid < 0 || opt.gid > this.#Data.length - 2) {
        return;
      }
      this.#Data[opt.gid + 1][0][0] = opt.status;
    } else if (opt.type === "all") {
      for (let gid = 1; gid < this.#Data.length; ++gid) {
        this.#Data[gid][0][0] = opt.status;
      }
    }
    this.#write();
  }
  groupAdd(name) {
    this.#Data.splice(1, 0, [[0, name]]);
    this.#write();
  }
  groupRename(gid, name) {
    if (gid < 0 || gid > this.#Data.length - 2 || name === "") {
      return;
    }
    this.#Data[gid + 1][0][1] = name;
    this.#write();
  }
  groupDelete(gid) {
    if (gid < 0 || gid > this.#Data.length - 2) {
      return;
    }
    this.#Data.splice(gid + 1, 1);
    this.#write();
  }
  linkAdd(info, gid) {
    if (gid < 0 || gid > this.#Data.length - 2) {
      return;
    }
    if (info.constructor !== Array || info.length !== 3) {
      return;
    }
    this.#Data[gid + 1].push(info);
    this.#write();
  }
  linkEdit(info, gid, lid) {
    if (gid < 0 || gid > this.#Data.length - 2) {
      return;
    } else if (lid < 0 || lid > this.#Data[gid + 1].length - 2) {
      return;
    }
    if (info.constructor !== Array || info.length !== 3) {
      return;
    }
    this.#Data[gid + 1][lid + 1] = info;
    this.#write();
  }
  linkDelete(gid, lid) {
    if (gid < 0 || gid > this.#Data.length - 2) {
      return;
    } else if (lid < 0 || lid > this.#Data[gid + 1].length - 2) {
      return;
    }
    this.#Data[gid + 1].splice(lid + 1, 1);
    this.#write();
  }
}
