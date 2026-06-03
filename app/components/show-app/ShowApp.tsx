'use client';
import {Button, Breadcrumbs, Card, Text, Label, Skeleton} from '@gravity-ui/uikit';
import MyProjects from '../MyProjects/MyProjects';

const ShowApp = () => {

  return (
    <div className="group-container">
        <Text className="mt-14" variant="header-2">Pet projects</Text>
        <MyProjects />
    </div>
  );
}
export default ShowApp;