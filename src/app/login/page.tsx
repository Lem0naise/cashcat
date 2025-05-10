import {Suspense} from 'react';
import LoginClient from '../loginClient/page';
import LoadingScreen from '../components/loading';

export default function Login() {
    return (
        <Suspense fallback={<LoadingScreen/>}>
            <LoginClient/>
        </Suspense>
    )
}