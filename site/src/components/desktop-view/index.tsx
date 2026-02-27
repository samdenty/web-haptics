import styles from "./styles.module.scss";

import { Footer } from "../footer";
import MobileView from "../mobile-view";
import { QRCode } from "../qrcode";

export default function DesktopView() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.phone}>
            <MobileView />
          </div>
          <div className={styles.qrcode}>
            <QRCode />
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}
