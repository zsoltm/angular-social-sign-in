import { ApplicationRef } from "@angular/core";
import { FacebookConfig } from "./facebook-config";
import { LoginService } from "../../login-service";
import { Observable, BehaviorSubject, from } from "rxjs";
import { map, tap, flatMap } from "rxjs/operators";
import { LoginToken } from "../../login-token";
import { FacebookSdkWrapper } from "./facebook-sdk-wrapper";
import { UserDetails } from "../../user-details";
import { ApiUserDetailsResponse } from "./api-user-details-response";

export class FacebookLoginService implements LoginService {
    static readonly ID = "facebook";
    readonly id = FacebookLoginService.ID;

    private readonly _sdkWrapper: FacebookSdkWrapper;
    private readonly _loginStatus = new BehaviorSubject(null) as BehaviorSubject<LoginToken | null>;

    constructor(document: Document, _config: FacebookConfig, private readonly _appRef: ApplicationRef) {
        this._sdkWrapper = new FacebookSdkWrapper(_config, document);
    }

    loginStatus(): Observable<LoginToken | null> {
        return this._loginStatus;
    }

    login(): Observable<LoginToken> {
        return this._sdkWrapper.sdk.pipe(
            flatMap((sdk) => sdk.login({scope: "public_profile,email"})),
            map((authResponse: fb.AuthResponse) => (
                {
                    id: authResponse.userID,
                    token: authResponse.accessToken
                }
            )),
            tap((loginToken) => this._loginStatus.next(loginToken))
        );
    }

    logout(): Observable<boolean> {
        return this._sdkWrapper.sdk
            .pipe(
                flatMap((sdk) => sdk.logout()),
                tap({
                    next: (logoutSuccess) => {
                        if (logoutSuccess) this._loginStatus.next(null);
                    },
                    complete: () => this._appRef.tick()
                })
            );
    }

    userDetails(token: LoginToken): Observable<UserDetails> {
        return this._sdkWrapper.sdk
            .pipe(
                flatMap((sdk) => sdk.userDetails(token)),
                map((apiDetails: ApiUserDetailsResponse) => (
                    {
                        name: apiDetails.name,
                        email: apiDetails.email,
                        id: apiDetails.id,
                        picture: apiDetails.picture.data.url
                    })),
                tap({
                    complete: () => {
                        this._appRef.tick(); // ngzone doesn't notices the change
                    }
                })
            );
    }
}
