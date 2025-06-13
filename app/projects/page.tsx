import { Text, Icon, Link } from '@gravity-ui/uikit';
import MyProjects  from '../components/MyProjects/MyProjects';

export default function Home() {
  return (
    <div className="page-container">
      <div className="content-container">
            <MyProjects />
      </div>
    </div>
  );
}
