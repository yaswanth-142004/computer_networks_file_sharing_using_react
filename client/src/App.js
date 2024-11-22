import "./App.css";
import io from "socket.io-client";
import { useEffect, useState } from "react";

const socket = io.connect("http://localhost:3001");

function App() {
  const [room, setRoom] = useState("");
  const [joinedRoom, setJoinedRoom] = useState(false);

  const [message, setMessage] = useState("");
  const [messageReceived, setMessageReceived] = useState("");
  const [file, setFile] = useState(null);
  const [fileReceived, setFileReceived] = useState(null);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [shareConfirmation, setShareConfirmation] = useState("");

  const [userCount, setUserCount] = useState(0);

  const joinRoom = () => {
    if (room !== "") {
      socket.emit("join_room", room, (ack) => {
        if (ack) {
          setJoinedRoom(true);
          setShareConfirmation(`Successfully joined room: ${room}`);
        } else {
          setShareConfirmation("Failed to join the room. Try again.");
        }
      });
    }
  };

  const sendMessage = () => {
    if (message !== "" && joinedRoom) {
      socket.emit("send_message", { message, room }, (ack) => {
        setShareConfirmation(ack ? "Message sent successfully!" : "Message failed to send.");
      });
    }
  };

  const shareFile = () => {
    if (file && room !== "") {
      const reader = new FileReader();
      reader.onload = () => {
        socket.emit(
          "file_share",
          {
            room,
            fileName: file.name,
            fileData: reader.result.split(",")[1],
          },
          (ack) => {
            if (ack) {
              setShareConfirmation("File shared successfully!");
              setSharedFiles((prevFiles) => [...prevFiles, { fileName: file.name, fileUrl: reader.result }]);
            } else {
              setShareConfirmation("File sharing failed.");
            }
          }
        );
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessageReceived(data.message);
    });

    socket.on("receive_file", (data) => {
      setFileReceived(`File received: ${data.fileName}`);
      setSharedFiles((prevFiles) => [...prevFiles, { fileName: data.fileName, fileUrl: data.fileUrl }]);
    });

    socket.on("user_count", (count) => {
      setUserCount(count);
    });
  }, []);

  return (
    <div className="App">
      <div className="room-container">
        <input
          placeholder="Room Number..."
          onChange={(event) => {
            setRoom(event.target.value);
          }}
        />
        <button onClick={joinRoom}>Join Room</button>
        {joinedRoom && <p>You have joined room: {room}</p>}
      </div>
      <div className="status-container">
        <p>Users in Room: {userCount}</p>
      </div>
      <div className="message-container">
        <input
          placeholder="Message..."
          onChange={(event) => {
            setMessage(event.target.value);
          }}
        />
        <button onClick={sendMessage}>Send Message</button>
        <h1>Message:</h1>
        {messageReceived && <p>{messageReceived}</p>}
      </div>
      <div className="file-container">
        <input
          type="file"
          onChange={(event) => {
            setFile(event.target.files[0]);
          }}
        />
        <button onClick={shareFile}>Share File</button>
        {fileReceived && <p>{fileReceived}</p>}
      </div>
      <div className="confirmation-container">
        {shareConfirmation && <p>{shareConfirmation}</p>}
      </div>
      <div className="shared-files-container">
        <h1>Shared Files:</h1>
        {sharedFiles.map((file, index) => (
          <div key={index}>
            <a href={file.fileUrl} download={file.fileName}>
              {file.fileName}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
