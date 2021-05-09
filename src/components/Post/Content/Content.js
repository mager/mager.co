// @flow strict
import React from "react";
import styles from "./Content.module.scss";
import Meta from "../Meta";

type Props = {
  body: string,
  date: string,
  title: string,
};

const Content = ({ body, date, title }: Props) => (
  <div className={styles["content"]}>
    <h1 className={styles["content__title"]}>{title}</h1>
    <div className={styles["content__meta"]}>
      <Meta date={date} />
    </div>
    <div
      className={styles["content__body"]}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  </div>
);

export default Content;
