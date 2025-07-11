class PromiseEx {
  #Acc = null;
  #Rej = null;
  #default() { }
  constructor(fn) {
    setTimeout(() => fn(this.#Acc, this.#Rej), 0);
  }
  then(fn) {
    this.#Acc = fn || this.#default;
    return this;
  }
  catch(fn) {
    this.#Rej = fn || this.#default;
    return this;
  }
}

class Alert {
  #leave = false;
  #click = false;
  #timer = null;
  #then = null;
  #$root = null;
  #$title = null;
  #$msg = null;
  #$close = null;
  #init() {
    if (this.#timer !== null) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    this.#leave = false;
    this.#click = false;
  }
  #handleClose() {
    this.#init();
    this.#$root.classList.remove("show");
    this.#then && this.#then();
    this.then = null;
  }
  #common(msg, sec) {
    this.#init();
    this.#$msg.textContent = msg;
    this.#timer = setTimeout(this.#handleClose.bind(this), sec * 1000);
  }
  constructor(root = "#alert") {
    this.#$root = document.querySelector(root);
    if (this.#$root === null) {
      throw new Error(`alert root element not found: ${root}`);
    }
    this.#$title = this.#$root.querySelector(".alert-title");
    this.#$msg = this.#$root.querySelector(".alert-msg");
    this.#$close = this.#$root.querySelector(".alert-close");

    this.#$close.addEventListener("click", () => {
      this.#click = true;
      this.#handleClose();
    });
    this.#$root.addEventListener("mouseenter", this.#init.bind(this));
    this.#$root.addEventListener("mouseleave", () => {
      if (!this.#click) {
        this.#leave = true;
        setTimeout(() => { this.#leave && this.#handleClose(); }, 1000);
      }
    });
  }
  info(msg, sec = 3) {
    this.#common(msg, sec);
    this.#$title.textContent = "提 示";
    this.#$root.classList.remove("error");
    this.#$root.classList.add("show");
    return this;
  }
  warn(msg, sec = 3) {
    this.#common(msg, sec);
    this.#$title.textContent = "错 误";
    this.#$root.classList.add("error", "show");
    return this;
  }
  then(fn) {
    this.#then = fn;
  }
}

class Detail {
  #$root = null;
  #$container = null;
  #$title = null;
  #$url = null;
  #$icon = null;
  #$name = null;
  #info = null;
  #then = null;
  #hide() {
    this.#$container.classList.remove("show");
    setTimeout(() => {
      this.#$root.classList.remove("show");
    }, 300);
    this.#$url.value = "";
    this.#$url.classList.remove("error");
    this.#$icon.value = "";
    this.#$icon.classList.remove("error");
    this.#$name.value = "";
    this.#$name.classList.remove("error");
    this.#then = null;
    this.#info = null;
  }
  constructor(root = "#detail") {
    this.#$root = document.querySelector(root);
    if (this.#$root === null) {
      throw new Error(`detail root element not found: ${root}`);
    }
    this.#$container = this.#$root.querySelector(".link-detail-container");
    this.#$title = this.#$root.querySelector(".link-detail-title");
    this.#$url = this.#$root.querySelector(".input-url");
    this.#$icon = this.#$root.querySelector(".input-icon");
    this.#$name = this.#$root.querySelector(".input-name");
    this.#$root.querySelectorAll("input").forEach($input => {
      $input.addEventListener("input", () => {
        $input.classList.remove("error");
      });
    });
    this.#$root.addEventListener("click", this.#hide.bind(this));
    this.#$container.addEventListener("click", e => e.stopPropagation());
    this.#$root.querySelector(".link-detail-submit").addEventListener("click", () => {
      const url = this.#$url.value, icon = this.#$icon.value, name = this.#$name.value;
      let valid = true;
      if (url === "") {
        valid = false;
        this.#$url.classList.add("error");
      }
      if (icon === "") {
        valid = false;
        this.#$icon.classList.add("error");
      }
      if (name === "") {
        valid = false;
        this.#$name.classList.add("error");
      }
      if (!valid) return;
      if (name !== this.#info[0] || url !== this.#info[1] || icon !== this.#info[2]) {
        this.#then && this.#then([name, url, icon]);
      }
      this.#hide();
    });
  }
  add() {
    this.#$title.textContent = "添加快捷方式";
    this.#$root.classList.add("show");
    setTimeout(() => {
      this.#$container.classList.add("show");
    }, 0);
    this.#info = ["", "", ""];
    return this;
  }
  edit(info) {
    this.#$title.textContent = "修改快捷方式";
    this.#$root.classList.add("show");
    setTimeout(() => {
      this.#$container.classList.add("show");
    }, 0);
    this.#$url.value = info[1];
    this.#$icon.value = info[2];
    this.#$name.value = info[0];
    this.#info = info;
    return this;
  }
  then(fn) {
    this.#then = fn;
    return this;
  }
}

class Confirm {
  #$root = null;
  #$title = null;
  #$text = null;
  #yesFn = null;
  #noFn = null;
  #over(yes) {
    if (yes) {
      this.#yesFn && this.#yesFn();
    } else {
      this.#noFn && this.#noFn();
    }
    this.#$root.classList.remove("show");
    this.#yesFn = null;
    this.#noFn = null;
  }
  constructor(root = "#confirm") {
    this.#$root = document.querySelector(root);
    if (this.#$root === null) {
      throw new Error(`confirm root element not found: ${root}`);
    }
    this.#$title = this.#$root.querySelector(".confirm-title");
    this.#$text = this.#$root.querySelector(".confirm-text");
    this.#$root.querySelector(".confirm-yes").addEventListener("click", this.#over.bind(this, true));
    this.#$root.querySelector(".confirm-no").addEventListener("click", this.#over.bind(this, false));
  }
  show(opt = {}) {
    this.#$title.textContent = opt.title || "请注意";
    this.#$text.textContent = opt.text || "此操作不可逆，是否继续？";
    this.#$root.classList.add("show");
    return this;
  }
  yes(fn) {
    this.#yesFn = fn;
    return this;
  }
  no(fn) {
    this.#noFn = fn;
    return this;
  }
}
