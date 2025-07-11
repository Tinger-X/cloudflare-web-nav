const EngineConf = {
  _R_: ["https://www.baidu.com/s?wd=", "baidu"],
  baidu: ["https://www.baidu.com/s?wd=", "百度一下，你就知道！"],
  bing: ["https://www.bing.com/search?q=", "有问题尽管问我..."],
  google: ["https://www.google.com/search?q=", "咕噜咕噜~"]
};

const $Body = document.querySelector("body"),
  $Engine = document.querySelector("#engine"),
  $SearchContent = document.querySelector("#search-content"),
  $LinkGroups = document.querySelector("#link-groups");

const TinAlert = new Alert("#alert"),
  TinConfirm = new Confirm("#confirm"),
  TinDetail = new Detail("#link-detail-layer"),
  TinManager = new Manager("/api", "Tin-Nav-Token");

const DeTouchTimeout = 400;

function clearTimer(timer) {
  if (timer !== null) clearTimeout(timer);
  return null;
}

function setEngine(key, update = false) {
  if (EngineConf._R_[1] === key) return;
  const old = EngineConf._R_[1];
  $Engine.setAttribute("src", `img/${key}.svg`);
  $Engine.setAttribute("alt", key);
  EngineConf._R_ = [EngineConf[key][0], key];
  $SearchContent.setAttribute("placeholder", EngineConf[key][1]);
  if (update) {
    TinManager.setEngine(key).catch(err => {
      TinAlert.warn(err);
      $Engine.setAttribute("src", `img/${old}.svg`);
      $Engine.setAttribute("alt", old);
      EngineConf._R_ = [EngineConf[old][0], old];
      $SearchContent.setAttribute("placeholder", EngineConf[old][1]);
    });
  }
}

function childIndex($parent, $child) {
  return Array.from($parent.children).indexOf($child);
}

function groupIndex($group) {
  return childIndex($group.parentNode, $group);
}

function linkGroupIndex($link) {
  return groupIndex($link.parentNode.parentNode);
}

function linkIndex($link) {
  return childIndex($link.parentNode, $link);
}

function slideBar() {
  const $slider = document.querySelector("#slide-bar"),
    $toTop = document.querySelector("#to-top");
  document.addEventListener("scroll", function () {
    const scrollHeight = document.body.scrollHeight - window.innerHeight, scrollTop = Math.min(window.scrollY, scrollHeight);
    $slider.style.width = `${(scrollTop / scrollHeight) * 100}%`;

    if (scrollTop > window.innerHeight * 0.5) {
      $toTop.classList.add("show");
    } else {
      $toTop.classList.remove("show");
    }
  });
  $toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  });
}

function loginStatus() {
  const $loginBtn = document.querySelector("#login-btn");

  if (TinManager.loginStatus()) {
    $Body.classList.add("user");
    $loginBtn.textContent = "退出登录";
  } else {
    $loginBtn.textContent = "点击登录";
  }
  $loginBtn.addEventListener("click", () => {
    if (TinManager.loginStatus()) {
      TinManager.logout();
      $Body.classList.remove("user");
      $loginBtn.textContent = "点击登录";
    } else {
      TinManager.oauthLogin(res => {
        if (res.code === 200) {
          TinAlert.info("登录成功");
          $Body.classList.add("user");
          $loginBtn.textContent = "退出登录";
        } else {
          TinAlert.warn(res.msg);
        }
      });
    }
  });
}

function engines() {
  let timer = null, show = false;
  const $engines = document.querySelectorAll(".engine:not(#engine)");

  $engines.forEach($eng => {
    $eng.addEventListener("click", function () {
      setEngine(this.getAttribute("alt"), true);
    });
    $eng.addEventListener("mouseenter", function () {
      show = true;
      timer = clearTimer(timer);
    });
    $eng.addEventListener("mouseleave", function () {
      show = false;
      timer = clearTimer(timer);
      timer = setTimeout(() => {
        show || $engines.forEach($eng => $eng.classList.remove("show"));
        timer = null;
      }, DeTouchTimeout);
    });
  });

  // TODO: 防止误触，search框也是
  $Engine.addEventListener("mouseenter", function () {
    show = true;
    timer = clearTimer(timer);
    timer = setTimeout(() => {
      show && $engines.forEach($eng => $eng.classList.add("show"));
      timer = null;
    }, DeTouchTimeout);
  });
  $Engine.addEventListener("mouseleave", function () {
    show = false;
    timer = clearTimer(timer);
    timer = setTimeout(() => {
      show || $engines.forEach($eng => $eng.classList.remove("show"));
      timer = null;
    }, DeTouchTimeout);
  });
}

function createRelate(local = true, text = "", fn) {
  const $relate = document.createElement("div");
  $relate.classList.add("relate-item");

  const $icon = document.createElement("img");
  const which = local ? "history" : "hot";
  $icon.setAttribute("src", `img/${which}.svg`);
  $icon.setAttribute("alt", which);
  $icon.classList.add("relate-icon");

  const $text = document.createElement("div");
  $text.classList.add("relate-text");
  $text.innerText = text;

  $relate.appendChild($icon);
  $relate.appendChild($text);

  if (local) {
    const $delete = document.createElement("img");
    $delete.setAttribute("src", "img/delete.svg");
    $delete.setAttribute("alt", "delete");
    $delete.classList.add("relate-delete");
    $delete.addEventListener("click", e => {
      TinManager.localRelateDelete(text);
      $relate.remove();
      e.stopPropagation();
    });
    $relate.appendChild($delete);
  }

  $relate.addEventListener("click", () => {
    fn && fn(text);
  });
  return $relate;
}

function isURL(str) {
  try {
    // 尝试直接解析
    const url = new URL(str);
    return {is: ["http:", "https:"].includes(url.protocol), res: str};
  } catch (e) {
    try {
      // 尝试补充http协议后再解析
      str = "http://" + str;
      const url = new URL(str);
      return {is: /^[^\s]+\.[^\s]+$/.test(url.hostname), res: str};
    } catch (e) {
      return {is: false, res: str};
    }
  }
}

function search() {
  let network_timer = null, show_timer = null, compose = false, cache = "", show = false;

  const $seach_img = document.querySelector("#search-image");
  const $relate_container = document.querySelector("#relate-container");
  const $local_relate = $relate_container.querySelector("#local-relate");
  const $engine_relate = $relate_container.querySelector("#engine-relate");

  const reset_timer = () => {
    network_timer = clearTimer(network_timer);
    const value = $SearchContent.value.trim();
    if (value === "") {
      return;
    }
    network_timer = setTimeout(() => {
      doRelate(EngineConf._R_[1], value);
      network_timer = null;
    }, 500);
  }

  const doRelate = (eng, val) => {
    if (val === cache) {
      return;
    }
    cache = val;

    TinManager.relate(eng, val).then(res => {
      if (res.type === "local") {
        $local_relate.innerHTML = "";
        res.data.forEach(word => {
          const $item = createRelate(true, word, doSearch);
          $local_relate.appendChild($item);
        });
      } else {
        $engine_relate.innerHTML = "";
        res.data.forEach(word => {
          const $item = createRelate(false, word, doSearch);
          $engine_relate.appendChild($item);
        });
      }
    }).catch(err => TinAlert.warn(err));
    $relate_container.classList.add("show");
  }
  const doSearch = (val) => {  // 搜索候选内容（传入val）或者输入框内容（不传val）
    network_timer = clearTimer(network_timer);
    const value = val || $SearchContent.value.trim();
    if (value === "") {
      return;
    }
    const judge = isURL(value);
    const url = judge.is ? judge.res : `${EngineConf._R_[0]}${value}`;
    window.open(url);
    $SearchContent.value = "";
    $relate_container.classList.remove("show");
    TinManager.localRelateUpdate(value);
  }

  const showRelate = () => {
    if ($local_relate.childNodes.length === 0 && $engine_relate.childNodes.length === 0) return;
    show = true;
    show_timer = clearTimer(show_timer);
    show_timer = setTimeout(() => {
      show && $relate_container.classList.add("show");
      show_timer = null;
    }, DeTouchTimeout);
  }
  const hideRelate = () => {
    show = false;
    show_timer = clearTimer(show_timer);
    show_timer = setTimeout(() => {
      show || $relate_container.classList.remove("show");
      show_timer = null;
    }, DeTouchTimeout);
  }

  $seach_img.addEventListener("click", doSearch);

  $relate_container.addEventListener("mouseenter", showRelate);
  $relate_container.addEventListener("mouseleave", hideRelate);

  $SearchContent.addEventListener("mouseenter", showRelate);
  $SearchContent.addEventListener("mouseleave", hideRelate);
  $SearchContent.addEventListener("compositionstart", () => {
    compose = true;
  });
  $SearchContent.addEventListener("compositionend", () => {
    compose = false;
    reset_timer();
  });
  $SearchContent.addEventListener("input", function () {
    network_timer = clearTimer(network_timer);
    if (compose) {
      return;
    }
    reset_timer();
  });
  $SearchContent.addEventListener("keydown", e => {
    if (e.keyCode === 13) {
      doSearch();
    }
  });
}

function createLink(info) {
  const $link = document.createElement("div");
  $link.classList.add("link");

  const $actions = document.createElement("div");
  $actions.classList.add("link-actions");
  const $delete = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  $delete.classList.add("link-delete");
  $delete.setAttribute("viewBox", "0 0 1024 1024");
  $delete.innerHTML = `<path d="M910.016 213.312h-148.928V113.92a49.664 49.664 0 0 0-49.664-49.664H313.92h-0.064a49.664 49.664 0 0 0-49.664 49.664v99.328H115.2a49.664 49.664 0 0 0 0 99.328h49.664V908.8c0 27.52 22.272 49.664 49.664 49.664h596.032a50.752 50.752 0 0 0 19.328-3.904 49.792 49.792 0 0 0 30.336-45.824V312.768v-0.128h49.664a49.6 49.6 0 0 0 0.128-99.328zM363.52 163.648h298.24v49.664H363.52v-49.664z m198.656 695.488H463.04V312.768v-0.128h99.136V859.136zM363.712 312.64V859.136H264.256V312.768v-0.128h99.456z m397.312 0.128v546.368h-99.456V312.768l-0.064-0.128h99.52v0.128z"/>`;
  $delete.addEventListener("click", e => {
    e.stopPropagation();
    TinConfirm.show({
      text: `是否确认删除【${info[0]}】`
    }).yes(() => {
      TinManager.linkDelete(
        linkGroupIndex($link),
        linkIndex($link)
      ).catch(err => {
        TinAlert.warn(err);
      });
      $link.remove();
    });
  });
  $actions.appendChild($delete);
  const $edit = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  $edit.classList.add("link-edit");
  $edit.setAttribute("viewBox", "0 0 1024 1024");
  $edit.innerHTML = `<path d="M928 365.664a32 32 0 0 0-32 32V864a32 32 0 0 1-32 32H160a32 32 0 0 1-32-32V160a32 32 0 0 1 32-32h429.6a32 32 0 0 0 0-64H160a96 96 0 0 0-96 96v704a96 96 0 0 0 96 96h704a96 96 0 0 0 96-96V397.664a32 32 0 0 0-32-32z"/><path d="M231.616 696.416a38.4 38.4 0 0 0 44.256 53.792l148-38.368L950.496 185.248 814.72 49.472 290.432 573.76l-58.816 122.656z m111.808-85.12L814.72 140l45.248 45.248-468.992 468.992-77.824 20.16 30.272-63.104z"/>`;
  $actions.appendChild($edit);
  $link.appendChild($actions);

  const $info = document.createElement("div");
  $info.classList.add("link-info");
  const $icon = document.createElement("img");
  $icon.classList.add("link-icon");
  $icon.setAttribute("src", info[2]);
  $icon.setAttribute("alt", "icon");
  $info.appendChild($icon);
  const $name = document.createElement("div");
  $name.classList.add("link-name");
  $name.innerText = info[0];
  $info.appendChild($name);
  $link.appendChild($info);

  $edit.addEventListener("click", e => {
    e.stopPropagation();
    TinDetail.edit(info).then(res => {
      const old = info;
      TinManager.linkEdit(
        res,
        linkGroupIndex($link),
        linkIndex($link)
      ).catch(err => {
        TinAlert.warn(err);
        info = old;
        $name.innerText = info[0];
        $icon.setAttribute("src", info[2]);
      });
      info = res;
      $name.innerText = info[0];
      $icon.setAttribute("src", info[2]);
    });
  });
  $link.addEventListener("click", () => window.open(info[1], "_blank"));

  return $link;
}

function appendLinkAdd($group, $links) {
  const $add = document.createElement("div");
  $add.classList.add("link-add");

  const $icon = document.createElement("img");
  $icon.classList.add("link-icon");
  $icon.setAttribute("src", "img/add.svg");
  $icon.setAttribute("alt", "icon");
  $add.appendChild($icon);
  const $name = document.createElement("div");
  $name.classList.add("link-name");
  $name.innerText = "点击添加连接";
  $add.appendChild($name);

  $add.addEventListener("click", () => {
    TinDetail.add().then(info => {
      $add.remove();
      const $link = createLink(info);
      $links.appendChild($link);
      $links.appendChild($add);
      TinManager.linkAdd(info, groupIndex($group)).catch(err => {
        TinAlert.warn(err);
      });
    });
  });
  $links.appendChild($add);
  new Sortable($links, {
    group: "shared",
    animation: 400,
    ghostClass: "sortable-ghost",
    draggable: ".link",
    handle: ".link",
    onEnd: handleLinkSortEnd
  });
}

function createGroup(group) {
  const [info, ...links] = group;
  let [collapse, name] = info;

  const $group = document.createElement("div");
  $group.classList.add("link-group-container");
  const control_class = collapse === 1 ? "collapse" : "expand";
  $group.classList.add(control_class);

  const $title = document.createElement("div");
  $title.classList.add("link-group-title-container");
  const $input = document.createElement("input");
  $input.classList.add("link-group-title");
  $input.setAttribute("type", "text");
  $input.setAttribute("placeholder", "[双击修改]");
  $input.value = name || "";
  $input.readOnly = true;
  $input.addEventListener("dblclick", () => {
    TinManager.loginStatus() && ($input.readOnly = false);
  });
  $input.addEventListener("blur", () => {
    $input.readOnly = true;
    if ($input.value === "") {
      $input.value = name;
      return TinAlert.warn("分组名不可为空");
    }
    if ($input.value === name) return;
    const old = name;
    name = $input.value;
    TinManager.groupRename(
      groupIndex($group),
      name
    ).catch(err => {
      TinAlert.warn(err);
      name = old;
      $input.value = old;
    });
  });
  $title.appendChild($input);

  const $dragger = document.createElement("div");
  $dragger.classList.add("group-dragger");
  $dragger.innerHTML = `<img src="img/drag.svg" alt="drag"/>`;
  $title.appendChild($dragger);

  const $actions = document.createElement("div");
  $actions.classList.add("link-group-actions");
  const $delete = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  $delete.classList.add("link-group-delete");
  $delete.setAttribute("viewBox", "0 0 1024 1024");
  $delete.innerHTML = `<path d="M512 1024C229.238154 1024 0 794.761846 0 512S229.238154 0 512 0s512 229.238154 512 512-229.238154 512-512 512z m236.307692-551.384615H551.384615V275.692308a39.384615 39.384615 0 1 0-78.76923 0v196.923077H275.692308a39.384615 39.384615 0 1 0 0 78.76923h196.923077v196.923077a39.384615 39.384615 0 1 0 78.76923 0V551.384615h196.923077a39.384615 39.384615 0 0 0 0-78.76923z"/>`;
  $delete.addEventListener("click", () => {
    TinConfirm.show({
      text: `是否确认删除【${name}】`
    }).yes(() => {
      TinManager.groupDelete(
        groupIndex($group)
      ).catch(err => {
        TinAlert.warn(err);
      });
      $group.remove();
    });
  });
  $actions.appendChild($delete);
  const $collapse = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  $collapse.classList.add("link-group-collapse");
  $collapse.setAttribute("viewBox", "0 0 1024 1024");
  $collapse.innerHTML = `<path d="M758.613333 465.493333l-221.013333 235.52a35.84 35.84 0 0 1-52.48 0L264.533333 465.066667a35.84 35.84 0 1 1 52.48-49.066667L512 623.786667l194.56-207.36a35.84 35.84 0 1 1 52.48 49.066666zM512 0a512 512 0 1 0 512 512A512 512 0 0 0 512 0z"/>`;
  $collapse.addEventListener("click", () => {
    const shown = $group.classList.contains("expand");
    if (shown) {
      $group.classList.remove("expand");
      $group.classList.add("collapse");
    } else {
      $group.classList.remove("collapse");
      $group.classList.add("expand");
    }
    TinManager.collapse({ type: "one", gid: groupIndex($group), status: shown ? 1 : 0 });
  });
  $actions.appendChild($collapse);
  $title.appendChild($actions);
  $group.appendChild($title);

  const $links = document.createElement("div");
  $links.classList.add("links");
  links.forEach(link => {
    const $link = createLink(link);
    $links.appendChild($link);
  });
  appendLinkAdd($group, $links);
  $group.appendChild($links);

  return $group;
}

function handleLinkSortEnd(event) {
  if (event.oldIndex === event.newIndex && event.from === event.to) {
    return;
  }

  const $links = event.to.parentNode.querySelector(".links");
  if ($links.children.length === 2) {
    const $add = $links.children[0];
    $add.remove();
    $links.appendChild($add);
    event.newIndex--;
  }
  const from = Array.from($LinkGroups.children).indexOf(event.from.parentNode);
  const to = Array.from($LinkGroups.children).indexOf(event.to.parentNode);

  TinManager.rank({
    type: "item",
    data: [from, event.oldIndex, to, event.newIndex]
  });
}

function handleGroupSortEnd(event) {
  if (event.oldIndex === event.newIndex) {
    return;
  }

  TinManager.rank({
    type: "group",
    data: [event.oldIndex, event.newIndex]
  });
}

function linkGroups() {
  $LinkGroups.innerHTML = "";
  document.querySelector("#link-group-add").addEventListener("click", () => {
    const name = "未命名分组" + ($LinkGroups.children.length + 1);
    const $group = createGroup([[0, name]]);
    if ($LinkGroups.children.length === 0) {
      $LinkGroups.appendChild($group);
    } else {
      $LinkGroups.insertBefore($group, $LinkGroups.children[0]);
    }

    TinManager.groupAdd(name).catch(err => {
      TinAlert.warn(err);
    });
  });
  document.querySelector("#link-groups-collapse").addEventListener("click", () => {
    const $expanded_list = document.querySelectorAll(".link-group-container.expand");
    if ($expanded_list.length > 0) {
      for (let i = 0; i < $expanded_list.length; ++i) {
        $expanded_list[i].classList.remove("expand");
        $expanded_list[i].classList.add("collapse");
      }
      TinManager.collapse({ type: "all", status: 1 });
    } else {
      const $collapsed_list = document.querySelectorAll(".link-group-container.collapse");
      for (let i = 0; i < $collapsed_list.length; ++i) {
        $collapsed_list[i].classList.remove("collapse");
        $collapsed_list[i].classList.add("expand");
      }
      TinManager.collapse({ type: "all", status: 0 });
    }
  });
  TinManager.detail().then(detail => {
    const [engine, ...groups] = detail;
    setEngine(engine);
    $LinkGroups.innerHTML = "";
    groups.forEach(group => {
      const $group = createGroup(group);
      $LinkGroups.appendChild($group);
    });
    new Sortable($LinkGroups, {
      animation: 400,
      ghostClass: "sortable-ghost",
      handle: ".group-dragger",
      onEnd: handleGroupSortEnd
    });
  }).catch(err => {
    let fn = null;
    if (err === -1) {
      msg = "系统尚未初始化，即将前往初始化";
      fn = () => window.open("/init.html", "_self");
    }
    TinAlert.warn(msg).then(fn);
  });
}

window.onload = function () {
  slideBar();
  loginStatus();
  engines();
  search();
  linkGroups();
}