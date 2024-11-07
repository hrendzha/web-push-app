class App {
  #elements = {};

  async init() {
    this.#getDOMElements();
    this.#addEventListeners();
    await this.#initSW();
    await this.#fetchSubscribers();
  }

  #getDOMElements() {
    this.#elements = {
      reqPermissionForNotifications: document.querySelector(".jsReqPermissionForNotifications"),
      subscribeToPushNotifications: document.querySelector(".jsSubscribeToPushNotifications"),
      sendNotification: document.querySelector(".jsSendNotification"),
      notificationForm: document.querySelector(".jsNotificationForm"),
      reloadUsersList: document.querySelector(".jsReloadUsersList"),
    };
  }

  #addEventListeners() {
    if (this.#elements.reqPermissionForNotifications) {
      this.#elements.reqPermissionForNotifications.addEventListener("click", this.#onReqPermissionForNotificationsClick);
    }

    if (this.#elements.subscribeToPushNotifications) {
      this.#elements.subscribeToPushNotifications.addEventListener("click", this.#onSubscribeToPushNotificationsClick);
    }

    if (this.#elements.reloadUsersList) {
      this.#elements.reloadUsersList.addEventListener("click", this.#onReloadUsersListClick);
    }

    if (this.#elements.notificationForm) {
      this.#elements.notificationForm.addEventListener("submit", this.#onNotificationFormSubmit);
    }
  }

  #onReloadUsersListClick = async () => {
    try {
      this.#elements.reloadUsersList.disabled = true;

      await this.#fetchSubscribers();
    } catch (e) {
      console.log("catch", e);
    } finally {
      this.#elements.reloadUsersList.disabled = false;
    }
  };

  #onNotificationFormSubmit = async e => {
    try {
      e.preventDefault();

      this.#elements.sendNotification.disabled = true;

      const username = this.#elements.notificationForm.elements.username.value.trim();
      const title = this.#elements.notificationForm.elements.title.value.trim();
      const body = this.#elements.notificationForm.elements.body.value.trim();

      if (!username || !title || !body) {
        Swal.fire({
          icon: "error",
          title: "fill form",
        });
        return;
      }

      const res = await fetch("/api/send-notification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, title, body }),
      });

      const data = await res.json();

      Swal.fire({
        icon: "info",
        title: data.message,
      });
    } catch (e) {
      console.log("catch", e);
      Swal.fire({
        icon: "error",
        title: e.message,
      });
    } finally {
      this.#elements.sendNotification.disabled = false;
    }
  };

  #onReqPermissionForNotificationsClick = async () => {
    const permission = await Notification.requestPermission();

    await Swal.fire({
      icon: permission === "granted" ? "success" : "error",
      title: `Notification permission ${permission}.`,
    });

    return;
  };

  #onSubscribeToPushNotificationsClick = async () => {
    try {
      this.#elements.subscribeToPushNotifications.disabled = true;

      if (Notification.permission === "denied") {
        Swal.fire({
          icon: "error",
          title: `Can't subscribe to push notifications because notification permissions were denied by the user.`,
        });
        return;
      }

      if (Notification.permission === "default") {
        Swal.fire({
          icon: "error",
          title: `First you should give permission for notifications.`,
        });
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      if (!registration) {
        Swal.fire({
          icon: "error",
          title: `There is no active service worker registration.`,
        });
        return;
      }

      const { value: username } = await Swal.fire({
        title: "Enter your username",
        input: "text",
        inputLabel: "Enter your username",
        inputValue: "",
        inputAttributes: {
          autocorrect: "off",
          autocomplete: "off",
        },
        showCancelButton: true,
        inputValidator: value => {
          if (!value) {
            return "You need to write something!";
          }
        },
      });

      if (!username) {
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: "BPbQbd9k8Kao0IgFQlqCVoyJOpeiCrQTE1BjsLsj708nMRnXd_RISiALdZjdFsAuF_DgIbETJSljPxIHuz2iXSo",
      });

      console.log("subscription", subscription);

      // Send this subscription to the server to store it
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, subscription }),
      });

      const body = await res.json();

      if (res.status !== 201) {
        Swal.fire({
          icon: "error",
          title: `Subscription error: ${res.statusText}`,
          text: body.message,
        });
        return;
      }

      Swal.fire({
        icon: "success",
        title: `User is subscribed`,
      });

      this.#fetchSubscribers();
    } catch (e) {
      console.log("catch", e);
    } finally {
      this.#elements.subscribeToPushNotifications.disabled = false;
    }
  };

  async #initSW() {
    if (!navigator.serviceWorker) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker registered. Registration: ", registration);
    } catch (e) {
      console.log("catch", e);
    }
  }

  // Fetch and populate subscribers
  async #fetchSubscribers() {
    const response = await fetch("/api/subscribers");
    const subscribers = await response.json();

    const select = this.#elements.notificationForm.elements.username;
    select.innerHTML = ""; // Clear the list

    subscribers.forEach(username => {
      const option = document.createElement("option");
      option.value = username;
      option.textContent = username;
      select.appendChild(option);
    });
  }
}

const app = new App();
app.init();
