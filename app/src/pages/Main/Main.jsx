/** @jsx jsx */
/** @jsxFrag React.Fragment */
// eslint-disable-next-line
import React, { useEffect, useState, useReducer, createContext } from "react";
import { jsx, css } from "@emotion/core";
import "aframe";
import "aframe-particle-system-component";
import { Entity, Scene } from "aframe-react";
import { Helmet } from "react-helmet";
import { playAudio } from "../../utils";
import SplashScreen from "../../components/SplashScreen";
import JitsiComponent from "../../components/JitsiComponent";
import PluginComponent from "../../components/PluginComponent";
import VoiceCommand from "../../components/VoiceCommand";
import VoiceClip from "../../components/VoiceClip";
import recorderReducer from "../../reducers/recorderReducer";
import img1 from "../../assets/img1.jpeg";
import img2 from "../../assets/img2.jpg";
import { Redirect } from "react-router-dom";
import { Box, Icon, Image, Stack, Text, useToast } from "@chakra-ui/core";

const TOAST_DURATION = 8000;

const defaultBackground1 = {
  data: img1,
  isVR: "true",
};

const defaultBackground2 = {
  data: img2,
  isVR: "true",
};

const initialRecorderState = {
  recorderIsBlocked: true,
  commandIsRecording: false,
  clipIsRecording: false,
};
const RecorderContext = createContext(initialRecorderState);

var displaySplashScreen = true;

function Main() {
  const [loaded, setLoading] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoading(true), 6000);
  }, []);

  const scenes = [defaultBackground1, defaultBackground2];
  const [room, setRoom] = useState("");
  const [call, setCall] = useState(false);
  const [openPlugin, setOpenPlugin] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [recorderState, recorderDispatch] = useReducer(
    recorderReducer,
    initialRecorderState
  );
  const toast = useToast();

  useEffect(() => {
    const otc = localStorage.getItem("otc");
    async function fetchUserData() {
      await fetch(`${process.env.REACT_APP_SERVER_URL}/api/otc/${otc}`)
        .then((r) => {
          if (r.ok) {
            return r.json();
          }
          throw r;
        })
        .then(({ message, data }) => {
          localStorage.setItem("user", JSON.stringify(data));
          return;
        })
        .catch(async (err) => {
          if (err instanceof Error) {
            throw err;
          }
          if (err.status === 403) {
            localStorage.setItem("user", "");
            localStorage.setItem("otc", "");
            return;
          }
          throw await err.json().then((rJson) => {
            console.error(
              `HTTP ${err.status} ${err.statusText}: ${rJson.message}`
            );
            return;
          });
        });
    }
    fetchUserData();
    //initUserMedia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rawUser = localStorage.getItem("user");
  if (!rawUser) {
    displaySplashScreen = false;
  }
  if (!rawUser) return <Redirect to="/onboarding" />;
  const user = JSON.parse(rawUser);

  // add user-uploaded background scenes
  user.backgrounds.forEach((background) => {
    scenes.unshift(background);
  });

  const handleChangeScene = () => {
    setCurrentSceneIndex((currentSceneIndex + 1) % scenes.length);
  };

  const handleMakeCall = async (contact_id) => {
    await fetch(`${process.env.REACT_APP_SERVER_URL}/api/otc/${user.otc}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `contact_id=${contact_id}&sms=true`,
    })
      .then((r) => {
        if (r.ok) {
          return r.json();
        }
        throw r;
      })
      .then(({ message, data }) => {
        setRoom(contact_id);
        setCall(!call);
      })
      .catch(async (err) => {
        if (err instanceof Error) {
          throw err;
        }
        throw await err.json().then((rJson) => {
          console.error(
            `HTTP ${err.status} ${err.statusText}: ${rJson.message}`
          );
          return;
        });
      });
  };

  const playTextToSpeech = async (text) => {
    await fetch(
      `${
        process.env.REACT_APP_SERVER_URL
      }/api/otc/watson/text-to-speech/${localStorage.getItem("otc")}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `text=${text}`,
      }
    )
      .then((res) => {
        if (res.ok) {
          const { body } = res;
          const reader = body.getReader();
          reader.read().then((result) => {
            playAudio(result.value);
          });
          return;
        }
        throw res;
      })
      .catch(async (err) => {
        if (err instanceof Error) {
          throw err;
        }
        console.error(
          `Audio Response - ${err.status} ${err.statusText}: ${err.message}`
        );
      });
  };

  const showToast = ({
    title,
    description,
    status,
    position,
    isClosable,
    duration,
    id,
  }) => {
    toast({
      title,
      description,
      status,
      position: position || "bottom",
      isClosable: isClosable || true,
      duration: duration || TOAST_DURATION,
      id,
    });
  };

  return loaded || !displaySplashScreen ? (
    <>
      <Helmet></Helmet>
      {openPlugin && (
        <div
          css={css`
            z-index: 50;
            position: relative;
            top: 10vh;
            left: 10vw;
            height: 80vh;
            width: 80vw;
          `}
        >
          <PluginComponent />
        </div>
      )}

      {user && call && (
        <div
          css={css`
            z-index: 50;
            position: relative;
            top: 10vh;
            left: 10vw;
            height: 80vh;
            width: 80vw;
          `}
        >
          <JitsiComponent
            roomName={room}
            password=""
            displayName={user.name}
            loadingComponent={<p>loading ...</p>}
            onMeetingEnd={() => setCall(false)}
          />
        </div>
      )}
      <div
        css={css`
          ${(call || openPlugin) && "filter: blur(5px);"}
          z-index: 10;
          position: absolute;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          ${scenes[currentSceneIndex].isVR === "false" &&
          `background-image: url(${scenes[currentSceneIndex].data});
           background-size: cover;`}
        `}
        onClick={() =>
          (openPlugin || call) && (setOpenPlugin(false) || setCall(false))
        }
      >
        {scenes[currentSceneIndex].isVR === "true" && (
          <Scene vr-mode-ui={{ enabled: false }} style={{ zIndex: -10 }}>
            {user.isSnowEnabled === "true" && (
              <Entity particle-system={{ preset: "snow" }} />
            )}
            <Entity
              primitive="a-sky"
              rotation="0 -140 0"
              src={scenes[currentSceneIndex].data}
              crossorigin="anonymous"
            />
          </Scene>
        )}
        {scenes.length > 1 && (
          <button onClick={handleChangeScene}>
            <Box
              pos="absolute"
              top="0"
              left="0"
              bg="rgba(12, 12, 12, 0.45)"
              pr="1rem"
              pb="1rem"
              pt="0.5rem"
              pl="0.5rem"
              roundedBottomRight="70%"
            >
              <Icon
                color="white"
                name="repeat"
                size="4rem"
                m="1rem"
                opacity="100%"
              />
            </Box>
          </button>
        )}
        {(
          <button onClick={setOpenPlugin}>
            <Box
              pos="absolute"
              bottom="0"
              right="0"
              bg="rgba(12, 12, 12, 0.45)"
              pr="1rem"
              pb="1rem"
              pt="0.5rem"
              pl="0.5rem"
              roundedTopLeft="70%"
            >
              <Icon
                color="white"
                name="external-link"
                size="4rem"
                m="1rem"
                opacity="100%"
              />
            </Box>
          </button>
        )}
        <RecorderContext.Provider value={[recorderState, recorderDispatch]}>
          <VoiceCommand
            isCloudEnabled={user.isCloudEnabled === "true"}
            commands={{
              changeScene: handleChangeScene,
              makeCall: handleMakeCall,
              customResponse: playTextToSpeech,
            }}
            onError={showToast}
          ></VoiceCommand>
          <VoiceClip
            isCloudEnabled={user.isCloudEnabled === "true"}
            onNotify={showToast}
          ></VoiceClip>
        </RecorderContext.Provider>
        {user.contacts && (
          <Box pos="absolute" bottom="20%" left="20vw" right="20vw">
            <Stack
              isInline
              spacing="6rem"
              display="flex"
              flexDirection="row"
              className="scrollable"
            >
              {user.contacts.map((contact, index) => (
                <Box className="contactBox">
                  <button
                    style={{ outline: "none" }}
                    onClick={() => handleMakeCall(contact._id)}
                  >
                    {contact.profileImage ? (
                      <Box
                        w="10rem"
                        h="10rem"
                        rounded="10%"
                        bg={colors[index % colors.length]}
                      >
                        <Image
                          rounded="10%"
                          size="10rem"
                          src={contact.profileImage}
                          pointerEvents="none"
                        />
                      </Box>
                    ) : (
                      <Box
                        w="10rem"
                        h="10rem"
                        rounded="10%"
                        bg={colors[index % colors.length]}
                      >
                        <Text fontSize="6rem" lineHeight="10rem">
                          {contact.name[0].toUpperCase()}
                        </Text>
                      </Box>
                    )}
                  </button>
                </Box>
              ))}
            </Stack>
          </Box>
        )}
      </div>
    </>
  ) : (
    <SplashScreen />
  );
}

const colors = ["yellow.50", "pink.300", "yellow.400", "red.500", "pink.800"];

export { RecorderContext };
export default Main;
