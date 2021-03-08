import { useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { Formik, Field } from "formik";

import { useUser } from "../../../../lib/hooks";
import { fetcher, capitalize, validateImageName } from "../../../../utils";

import {
  Text,
  Heading,
  FormErrorMessage,
  FormLabel,
  FormControl,
  Input,
  Button,
  Checkbox,
} from "@chakra-ui/core";

import { Nav } from "../../../../components/Nav";
import { Container } from "../../../../components/Container";
import { Main } from "../../../../components/Main";
import { Footer } from "../../../../components/Footer";
import Breadcrumbs from "../../../../components/Breadcrumbs";
import Loading from "../../../../components/Loading";
import * as yup from "yup";

const SUPPORTED_FORMATS = ["image/jpg", "image/jpeg", "image/gif", "image/png"];

const NewBackgroundForm = ({ consumer_id, router }) => {
  const [formError, setFormError] = useState("");
  const fileToBase64 = (inputFile) => {
    const tempFileReader = new FileReader();

    return new Promise((resolve, reject) => {
      tempFileReader.onerror = () => {
        tempFileReader.abort();
        reject(new DOMException("Problem parsing background file."));
      };

      tempFileReader.onload = () => {
        resolve(tempFileReader.result);
      };
      tempFileReader.readAsDataURL(inputFile);
    });
  };

  const handleFormSubmit = async (values, actions) => {
    values.imageFile = await fileToBase64(values.imageFile);
    values.consumer_id = router.query.consumer_id;

    const formBody = Object.entries(values)
      .map(
        ([key, value]) =>
          encodeURIComponent(key) + "=" + encodeURIComponent(value)
      )
      .join("&");

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody,
    };
    await fetch(`/api/background`, options)
      .then((r) => {
        if (r.ok) {
          router.replace(`/dashboard/consumer/${consumer_id}`);
          actions.setSubmitting(false);
          return r.json();
        }
        throw r;
      })
      .catch(async (err) => {
        actions.setSubmitting(false);
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

  return (
    <Formik
      initialValues={{ imageFile: null, imageName: "", isVR: "true" }}
      onSubmit={handleFormSubmit}
      validationSchema={yup.object().shape({
        imageFile: yup
          .mixed()
          .notRequired()
          .test(
            "fileType",
            "Unsupported File Format",
            (value) =>
              !value || (value && SUPPORTED_FORMATS.includes(value.type))
          ),
      })}
    >
      {({
        isSubmitting,
        handleSubmit,
        handleChange,
        setFieldValue,
        values,
      }) => (
        <form onSubmit={handleSubmit}>
          <Field name="imageName" validate={validateImageName}>
            {({ field, form }) => (
              <FormControl
                isInvalid={form.errors.imageName && form.touched.imageName}
              >
                <FormLabel htmlFor="imageName">Image Title</FormLabel>
                <Input
                  {...field}
                  id="imageName"
                  placeholder="Holiday family photo"
                />
                <FormErrorMessage>{form.errors.imageName}</FormErrorMessage>
              </FormControl>
            )}
          </Field>

          <FormControl my="1rem">
            <FormLabel>
              <Checkbox
                mr="1rem"
                size="lg"
                name="isVR"
                checked={values.isVR}
                isChecked={values.isVR}
                onChange={handleChange}
              />
              Enable VR viewing?
            </FormLabel>
          </FormControl>

          <FormLabel htmlFor="imageFile">Upload Image</FormLabel>

          <br />

          <input
            id="imageFile"
            name="imageFile"
            type="file"
            accept="image/*"
            onChange={(event) => {
              setFieldValue("imageFile", event.currentTarget.files[0]);
            }}
            className="form-control"
          />

          <br />

          {formError && <Text color="crimson">{formError}</Text>}
          <Button
            type="submit"
            disabled={values.imageName === "" || values.imageFile === null}
            className="btn btn-primary"
            mt={4}
            isLoading={isSubmitting}
            variantColor="blue"
          >
            Save background
          </Button>
        </form>
      )}
    </Formik>
  );
};

const NewBackgroundPage = () => {
  const router = useRouter();
  const user = useUser({ redirectTo: "/login" });

  const { consumer_id } = router.query;

  const { data: consumer } = useSWR(
    consumer_id && `/api/consumer/${consumer_id}`,
    fetcher
  );

  return user && consumer ? (
    <Container>
      <Nav />
      <Main>
        <Breadcrumbs
          links={[
            ["Dashboard", "/dashboard"],
            [
              `${capitalize(consumer.name)}'s User Profile`,
              `/dashboard/consumer/${consumer_id}`,
            ],
            ["Add Background", "#"],
          ]}
        />
        <Heading>
          Upload a New Background for {capitalize(consumer.name)}
        </Heading>
        <Text>
          {capitalize(consumer.name)} will be able to see this image as a
          background in the lobby. If VR viewing is selected, the background
          will be interactive.
          <br />
          <br />
          Note: In the lobby there is always a set of default backgrounds which
          cannot be removed.
        </Text>
        <NewBackgroundForm router={router} consumer_id={consumer_id} />
      </Main>
      <Footer />
    </Container>
  ) : (
    <Loading />
  );
};

export default NewBackgroundPage;