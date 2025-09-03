
import { Link } from "react-router-dom";
export default function DisAgreePage() {

    return (

        <main className="grid min-h-full place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8">
            <div className="text-center">
                <p className="mt-6 text-base leading-7 text-gray-600">As you have indicated that you do not consent to participate in this study please return this submission on Prolific by selecting the 'stop without completing' button</p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                    <Link to={``}>
                        <a
                            href="/"
                            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >
                            Go back home
                        </a>
                    </Link>
                </div>
            </div>
        </main>
    );
}