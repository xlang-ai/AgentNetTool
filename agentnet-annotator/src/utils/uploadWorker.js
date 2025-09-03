const workercode = () => {
  self.addEventListener("message", async (e) => {
    const { recordingName, eventsList, duration } = e.data;
    try {
      const confirmResponse = await fetch(
        `http://localhost:5328/api/recording/${recordingName}/confirm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventsList),
        }
      );
      const confirmResult = await confirmResponse.json();

      if (confirmResponse.ok) {
        self.postMessage({ type: "UPLOAD_STARTED" });
        try {
          const uploadResponse = await fetch(
            `http://localhost:5328/api/recording/${recordingName}/upload`
          );
          const uploadResult = await uploadResponse.json();

          if (uploadResponse.ok) {
            self.postMessage({
              type: "UPLOAD_SUCCESS",
              message: uploadResult.success,
            });
          } else {
            self.postMessage({
              type: "UPLOAD_ERROR",
              error: uploadResult.error,
            });
          }
        } catch (error) {
          self.postMessage({
            type: "UPLOAD_ERROR",
            error: error,
          });
        }
      } else {
        self.postMessage({
          type: "CONFIRM_ERROR",
          error: confirmResult.error,
        });
      }
    } catch (error) {
      self.postMessage({
        type: "NETWORK_ERROR",
        error: "Network error or server is down.",
      });
    }
  });
};
let code = workercode.toString();
code = code.substring(code.indexOf("{") + 1, code.lastIndexOf("}"));

const blob = new Blob([code], { type: "application/javascript" });
const worker_script = URL.createObjectURL(blob);

module.exports = worker_script;
