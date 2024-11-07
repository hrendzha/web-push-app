self.addEventListener("push", event => {
  console.log("sw push event -> event", event);

  const data = event.data.json();

  console.log("sw push event -> data", data);

  const title = data.title || "Default title";
  const options = {
    body: data.body || "Default message",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
