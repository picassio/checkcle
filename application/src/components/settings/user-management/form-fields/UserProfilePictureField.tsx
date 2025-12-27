/**
 * UserProfilePictureField Component
 *
 * Avatar selection grid with responsive layout.
 * Follows Modern Professional design system patterns.
 */

import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Control } from "react-hook-form";
import { Check } from "lucide-react";

// Custom interface for local profile images
interface ProfileImage {
  url: string;
  label: string;
}

// Define local profile image paths - include all uploaded SVG images
const localProfileImages: ProfileImage[] = [
  { url: "/upload/profile/profile1.svg", label: "Profile 1" },
  { url: "/upload/profile/profile2.svg", label: "Profile 2" },
  { url: "/upload/profile/profile3.svg", label: "Profile 3" },
  { url: "/upload/profile/profile4.svg", label: "Profile 4" },
  { url: "/upload/profile/profile5.svg", label: "Profile 5" },
  { url: "/upload/profile/profile6.svg", label: "Profile 6" },
  { url: "/upload/profile/profile7.svg", label: "Profile 7" },
  { url: "/upload/profile/profile8.svg", label: "Profile 8" }
];

interface UserProfilePictureFieldProps {
  control: Control<any>;
}

const UserProfilePictureField = ({ control }: UserProfilePictureFieldProps) => {
  return (
    <FormField
      control={control}
      name="avatar"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm font-medium">Profile Picture</FormLabel>
          <RadioGroup
            onValueChange={field.onChange}
            value={field.value}
            className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3 mt-2"
          >
            {localProfileImages.map((avatar) => {
              const isSelected = field.value === avatar.url;

              return (
                <FormItem key={avatar.url} className="flex flex-col items-center justify-center">
                  <FormControl>
                    <RadioGroupItem
                      value={avatar.url}
                      id={`new-${avatar.url}`}
                      className="sr-only"
                    />
                  </FormControl>
                  <label
                    htmlFor={`new-${avatar.url}`}
                    className={`
                      relative cursor-pointer rounded-lg p-1 sm:p-1.5
                      transition-all duration-200
                      ${isSelected
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background bg-primary/5"
                        : "hover:bg-muted/50 hover:ring-2 hover:ring-muted"
                      }
                    `}
                  >
                    <Avatar className="h-12 w-12 sm:h-14 sm:w-14 shadow-sm">
                      <AvatarImage src={avatar.url} alt={avatar.label} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">?</AvatarFallback>
                    </Avatar>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </label>
                </FormItem>
              );
            })}
          </RadioGroup>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default UserProfilePictureField;
