'use client';
import {Button, Breadcrumbs, Card, Text, Label, Skeleton} from '@gravity-ui/uikit';
import MyProjects from '../MyProjects/MyProjects';

const ShowApp = () => {

  return (
    <div className="group-container">
        <Text className="show-app__title" variant="header-2">Pet projects</Text>
        <MyProjects />
    </div>
  );
}
export default ShowApp;