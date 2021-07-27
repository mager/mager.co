// @flow strict
import React from "react";
import Author from "./Author";
import Contacts from "./Contacts";
import Menu from "./Menu";
import styles from "./Sidebar.module.scss";
import { useSiteMetadata } from "../../hooks";

type Props = {
  isIndex?: boolean,
};

const Sidebar = ({ isIndex }: Props) => {
  const { author, menu } = useSiteMetadata();

  return (
    <div className={styles["sidebar"]}>
      <div className={styles["sidebar__inner"]}>
        <Author author={author} isIndex={isIndex} />
        <Menu menu={menu} />
        <Contacts contacts={author.contacts} />
        <h4>
          <a href={"/resume.pdf"}>Resume</a>
        </h4>
      </div>
    </div>
  );
};

export default Sidebar;
